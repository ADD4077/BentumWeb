from django.db import models

class User(models.Model):
    student_code = models.CharField(max_length=10, unique=True)
    red_code = models.CharField(max_length=7)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.student_code