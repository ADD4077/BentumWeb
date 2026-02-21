from django.db import models

class User(models.Model):
    fullname = models.CharField(max_length=100)
    faculty = models.CharField(max_length=10)
    student_code = models.CharField(max_length=10, unique=True)
    bilet_code = models.CharField(max_length=7)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'users'

    def __str__(self):
        return self.student_code


class UserSession(models.Model):
    student_code = models.CharField(max_length=10, db_index=True)
    session_key = models.CharField(max_length=40, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'user_sessions'
        indexes = [
            models.Index(fields=['student_code', 'created_at']),
        ]