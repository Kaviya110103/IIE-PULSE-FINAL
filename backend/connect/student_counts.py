import re

from django.db.models import Q, Count

from .models import Batches, CompletedStudent, Students


def canonical_branch(value):
    value = re.sub(r'\s+', ' ', value or '').strip().lower()
    if value == 'kunniyamuthur':
        return 'kuniyamuthur'
    return value


def branch_values(branch):
    branch = canonical_branch(branch)
    if branch == '100ft':
        return ['100ft', '100FT']
    if branch == 'hopes':
        return ['hopes', 'Hopes', 'HOPES']
    if branch == 'kuniyamuthur':
        return ['kuniyamuthur', 'Kuniyamuthur', 'KUNIYAMUTHUR', 'kunniyamuthur', 'Kunniyamuthur', 'KUNNIYAMUTHUR']
    return [branch] if branch else []


def completed_students_queryset():
    return CompletedStudent.objects.filter(completion_type='full')


def _completed_original_ids():
    student_ids = []
    student_pks = []
    for completed_id in completed_students_queryset().values_list('original_student_id', flat=True):
        if not completed_id:
            continue
        value = str(completed_id).strip()
        student_ids.append(value)
        if value.isdigit():
            student_pks.append(int(value))
    return student_ids, student_pks


def active_students_queryset():
    qs = Students.objects.all()
    student_ids, student_pks = _completed_original_ids()
    exclude_filter = Q()
    if student_ids:
        exclude_filter |= Q(student_id__in=student_ids)
    if student_pks:
        exclude_filter |= Q(id__in=student_pks)
    return qs.exclude(exclude_filter).distinct() if exclude_filter else qs.distinct()


def active_students_for_branch(branch):
    values = branch_values(branch)
    if not values:
        return active_students_queryset().none()
    return active_students_queryset().filter(branch__in=values).distinct()


def active_students_for_batch(batch):
    return active_students_queryset().filter(
        Q(assigned_batch=batch) |
        Q(batch_enrollments__batch=batch, batch_enrollments__is_active=True)
    ).distinct()


def active_students_for_staff(staff):
    if not staff:
        return active_students_queryset().none()
    return active_students_queryset().filter(
        Q(assigned_staff=staff) |
        Q(assigned_batch__faculty=staff) |
        Q(assigned_batch__trainer_assignments__trainer=staff) |
        Q(batch_enrollments__batch__faculty=staff, batch_enrollments__is_active=True) |
        Q(batch_enrollments__batch__trainer_assignments__trainer=staff, batch_enrollments__is_active=True)
    ).distinct()


def assigned_students_for_branch(branch):
    return active_students_for_branch(branch).filter(
        Q(assigned_staff__isnull=False) |
        Q(assigned_batch__isnull=False) |
        Q(batch_enrollments__is_active=True)
    ).distinct()


def completed_students_for_branch(branch):
    values = branch_values(branch)
    if not values:
        return completed_students_queryset().none()
    return completed_students_queryset().filter(branch__in=values).distinct()


def completed_students_for_staff(staff):
    qs = completed_students_queryset()
    if not staff:
        return qs.none()
    staff_batches = Batches.objects.filter(
        Q(faculty=staff) | Q(trainer_assignments__trainer=staff)
    ).distinct()
    batch_ids = [str(batch_id) for batch_id in staff_batches.values_list('id', flat=True)]
    batch_numbers = staff_batches.values_list('batch_number', flat=True)
    staff_name = ' '.join(part for part in [staff.first_name, staff.last_name] if part).strip()
    staff_filters = Q(graduated_from_trainer=staff) | Q(batch_id__in=batch_ids) | Q(batch_number__in=batch_numbers)
    if staff_name:
        staff_filters |= Q(faculty_name__iexact=staff_name)
    return qs.filter(staff_filters).distinct()


def canonical_branch_count_rows(qs, field='branch'):
    rows = (
        qs.exclude(**{f'{field}__isnull': True})
        .exclude(**{field: ''})
        .values(field)
        .annotate(count=Count('pk'))
        .order_by(field)
    )

    counts = {}

    for row in rows:
        key = canonical_branch(row[field])

        if key:
            counts[key] = counts.get(key, 0) + row['count']

    branch_order = ['100ft', 'hopes', 'kuniyamuthur']

    return [
        {'branch': branch, 'count': count}
        for branch, count in sorted(
            counts.items(),
            key=lambda item: (
                branch_order.index(item[0])
                if item[0] in branch_order
                else len(branch_order),
                item[0]
            )
        )
    ]
