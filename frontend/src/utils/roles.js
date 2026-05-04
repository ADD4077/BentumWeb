export const ROLE_LABELS = {
  student: 'Студент',
  teacher: 'Преподаватель',
  chairperson: 'Председатель',
  moderator: 'Модератор',
  admin: 'Администратор',
};

export const USER_ROLE_OPTIONS = [
  { value: 'student', label: ROLE_LABELS.student },
  { value: 'teacher', label: ROLE_LABELS.teacher },
  { value: 'chairperson', label: ROLE_LABELS.chairperson },
  { value: 'moderator', label: ROLE_LABELS.moderator },
];

export function getRoleLabel(role) {
  return ROLE_LABELS[role] || role || ROLE_LABELS.student;
}
