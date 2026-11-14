from django.db import migrations, models


def prefix_existing_student_ids(apps, schema_editor):
    Students = apps.get_model('connect', 'Students')
    CompletedStudent = apps.get_model('connect', 'CompletedStudent')
    ReassignedStudentRecord = apps.get_model('connect', 'ReassignedStudentRecord')

    existing_ids = set(Students.objects.values_list('student_id', flat=True))
    replacements = {}

    for student in Students.objects.all().only('id', 'student_id'):
        old_id = (student.student_id or '').strip()
        if not old_id or old_id.upper().startswith('IIE-'):
            continue

        new_id = f'IIE-{old_id}'
        if len(new_id) > 30:
            raise RuntimeError(f'Student ID is too long to prefix safely: {old_id}')
        if new_id in existing_ids:
            raise RuntimeError(
                f'Cannot prefix student ID {old_id}: {new_id} already belongs to another record.'
            )
        replacements[old_id] = new_id
        existing_ids.add(new_id)

    for old_id, new_id in replacements.items():
        Students.objects.filter(student_id=old_id).update(student_id=new_id)
        CompletedStudent.objects.filter(student_id=old_id).update(student_id=new_id)
        CompletedStudent.objects.filter(original_student_id=old_id).update(original_student_id=new_id)
        ReassignedStudentRecord.objects.filter(student_code=old_id).update(student_code=new_id)


class Migration(migrations.Migration):
    dependencies = [('connect', '0055_useractivity_device_id')]

    operations = [
        migrations.AlterField(
            model_name='students',
            name='student_id',
            field=models.CharField(max_length=30, unique=True),
        ),
        migrations.AlterField(
            model_name='completedstudent',
            name='original_student_id',
            field=models.CharField(max_length=30),
        ),
        migrations.AlterField(
            model_name='completedstudent',
            name='student_id',
            field=models.CharField(max_length=30),
        ),
        migrations.RunPython(prefix_existing_student_ids, migrations.RunPython.noop),
    ]
