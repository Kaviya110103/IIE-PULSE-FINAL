import csv
import io
from datetime import timedelta

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import DailyActivityAttempt as Attempt, DailyActivityChallenge as Challenge, Employee, Students


def parse_questions(upload):
    headers = ['question', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer', 'explanation']
    if not upload or upload.size > 2_000_000:
        raise ValidationError('Choose a CSV file under 2 MB.')
    try:
        reader = csv.DictReader(io.StringIO(upload.read().decode('utf-8-sig')), strict=True)
        aliases = {'questions': 'question', 'explaination': 'explanation'}
        names = [h.strip().lower().replace(' ', '_') for h in reader.fieldnames or []]
        reader.fieldnames = [aliases.get(h, h) for h in names]
        if not set(headers).issubset(reader.fieldnames) or len(set(reader.fieldnames)) != len(reader.fieldnames):
            raise ValidationError('Required CSV columns: Questions, Option A, Option B, Option C, Option D, Correct Answer, Explaination.')
        questions = []
        for row in reader:
            values = [(row[h] or '').strip() for h in headers]
            question, *options, key, explanation = values
            if not all(values) or None in row or len(set(options)) != 4 or key.upper() not in ('A', 'B', 'C', 'D'):
                raise ValidationError(f'Invalid row {reader.line_num}: supply four distinct options, an answer A-D and an explanation.')
            questions.append(dict(question=question, options=options, correct=ord(key.upper()) - ord('A'), explanation=explanation))
            if len(questions) > 500:
                raise ValidationError('A challenge can contain at most 500 questions.')
    except (UnicodeError, csv.Error) as exc:
        raise ValidationError('Use a valid UTF-8 CSV file.') from exc
    if not questions:
        raise ValidationError('Include at least one question.')
    return questions


def student_for(request):
    student = Students.objects.filter(user=request.user).first()
    if not student:
        raise PermissionDenied('Student access required.')
    return student


def cycle_for(anchor, today):
    return anchor + timedelta(days=30 * ((today - anchor).days // 30))


def unseen(student):
    return Challenge.objects.filter(is_deleted=False).exclude(viewed_by=student).exclude(pk__in=Attempt.objects.filter(student=student).values('challenge_id'))


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def activity_inbox(request):
    student = student_for(request)
    if request.method == 'POST':
        ids = request.data.get('ids')
        if not isinstance(ids, list) or any(type(i) is not int for i in ids):
            raise ValidationError('Expected challenge IDs.')
        Challenge.viewed_by.through.objects.bulk_create([
            Challenge.viewed_by.through(dailyactivitychallenge_id=i, students_id=student.pk)
            for i in unseen(student).filter(pk__in=ids).values_list('pk', flat=True)
        ], ignore_conflicts=True)
    return Response({'unread': list(unseen(student).values_list('pk', flat=True))})


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def challenges(request):
    staff = Employee.objects.filter(user=request.user).first()
    if request.method == 'POST':
        if not staff:
            raise PermissionDenied('Staff access required.')
        title = str(request.data.get('title', '')).strip()
        category = request.data.get('category')
        if not title or len(title) > 200 or category not in ('Aptitude', 'Grammar', 'Behaviour'):
            raise ValidationError('Enter a title (up to 200 characters) and a valid category.')
        item = Challenge.objects.create(title=title, category=category, uploader=staff, questions=parse_questions(request.FILES.get('file')))
        return Response({'id': item.pk}, status=201)
    attempts = [] if staff else list(Attempt.objects.filter(student=student_for(request)).select_related('challenge').order_by('-submitted_at'))
    done = {a.challenge_id for a in attempts}
    cycle_counts = {}
    for a in attempts:
        cycle_counts[a.cycle_start] = cycle_counts.get(a.cycle_start, 0) + 1
    today = timezone.localdate()
    current = cycle_for(min(cycle_counts), today) if cycle_counts else today
    return Response({
        'challenges': [dict(id=c.pk, title=c.title, category=c.category, uploaded_at=c.uploaded_at,
                            uploader=f'{c.uploader.first_name} {c.uploader.last_name or ""}'.strip(),
                            total=len(c.questions), completed=c.pk in done)
                       | {'can_delete': bool(staff and c.uploader_id == staff.pk)}
                       for c in Challenge.objects.filter(is_deleted=False).select_related('uploader').order_by('-uploaded_at')],
        'results': [dict(id=a.challenge_id, title=a.challenge.title, category=a.challenge.category,
                         date=a.submitted_at, score=a.score, total=len(a.answers)) for a in attempts],
        'streak': min(30, cycle_counts.get(current, 0)), 'completed': len(done),
        'history': [dict(start=start, days=min(30, count)) for start, count in cycle_counts.items() if start != current],
    })


@api_view(['GET', 'POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def challenge_detail(request, pk):
    item = get_object_or_404(Challenge, pk=pk)
    if request.method == 'DELETE':
        if not Employee.objects.filter(pk=item.uploader_id, user=request.user).exists():
            raise PermissionDenied('Only the uploading trainer can delete this challenge.')
        Challenge.objects.filter(pk=pk).update(is_deleted=True)
        return Response(status=204)
    if item.is_deleted and not (request.method == 'GET' and Attempt.objects.filter(challenge=item, student__user=request.user).exists()):
        return Response({'detail': 'Challenge no longer available.'}, status=404)
    if request.method == 'GET' and Employee.objects.filter(user=request.user).exists():
        return Response({'title': item.title, 'questions': item.questions})
    student = student_for(request)
    if request.method == 'POST':
        answers = request.data.get('answers')
        if not isinstance(answers, list) or len(answers) != len(item.questions) or any(type(i) is not int or not 0 <= i < 4 for i in answers):
            raise ValidationError('Select one answer for every question.')
        with transaction.atomic():
            get_object_or_404(Challenge.objects.select_for_update(), pk=pk, is_deleted=False)
            Students.objects.select_for_update().get(pk=student.pk)
            previous = Attempt.objects.filter(student=student)
            if previous.filter(challenge=item).exists():
                return Response({'detail': 'Already submitted.'}, status=409)
            today = timezone.localdate()
            anchor = previous.order_by('cycle_start').values_list('cycle_start', flat=True).first() or today
            Attempt.objects.create(student=student, challenge=item, answers=answers, activity_day=today,
                                   cycle_start=cycle_for(anchor, today), score=sum(q['correct'] == a for q, a in zip(item.questions, answers)))
        return Response({'submitted': True}, status=201)
    attempt = Attempt.objects.filter(student=student, challenge=item).first()
    return Response({'title': item.title, 'completed': bool(attempt), 'questions': [
        dict(**q, selected=attempt.answers[i]) if attempt else dict(question=q['question'], options=q['options'])
        for i, q in enumerate(item.questions)
    ]})
