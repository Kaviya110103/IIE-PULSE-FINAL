from django.core.management.base import BaseCommand, CommandError

from connect.models import CourseSession
from connect.services.challenge_ai import ChallengeAIError, generate_questions_for_completed_session
from connect.services.challenge_service import ChallengeValidationError


class Command(BaseCommand):
    help = 'Generate 15-day challenge MCQs for staff-completed CourseSession records.'

    def add_arguments(self, parser):
        parser.add_argument('--session-id', type=int, help='Generate questions for one CourseSession id.')
        parser.add_argument('--batch-id', type=int, help='Generate questions for completed sessions in one batch.')
        parser.add_argument('--count', type=int, default=5, help='Questions to request per session.')

    def handle(self, *args, **options):
        session_id = options.get('session_id')
        batch_id = options.get('batch_id')
        count = options.get('count') or 5

        sessions = CourseSession.objects.filter(
            staff_completed=True,
            completed_by__isnull=False,
        ).select_related('batch', 'batch__course_name', 'completed_by')

        if session_id:
            sessions = sessions.filter(id=session_id)
        if batch_id:
            sessions = sessions.filter(batch_id=batch_id)
        if not session_id and not batch_id:
            raise CommandError('Use --session-id or --batch-id to keep generation intentionally scoped.')

        if not sessions.exists():
            self.stdout.write(self.style.WARNING('No eligible completed sessions found.'))
            return

        total_created = 0
        total_skipped = 0
        for session in sessions:
            try:
                result = generate_questions_for_completed_session(session, count=count)
            except (ChallengeValidationError, ChallengeAIError) as exc:
                self.stdout.write(self.style.ERROR(f'Session {session.id}: {exc}'))
                continue

            created_count = len(result['created'])
            skipped_count = len(result['skipped'])
            total_created += created_count
            total_skipped += skipped_count
            self.stdout.write(
                self.style.SUCCESS(
                    f'Session {session.id}: created={created_count}, skipped={skipped_count}'
                )
            )

        self.stdout.write(self.style.SUCCESS(
            f'Challenge question generation finished. created={total_created}, skipped={total_skipped}'
        ))
