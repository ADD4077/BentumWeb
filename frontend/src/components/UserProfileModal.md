# UserProfileModal - Модальное окно профиля пользователя

## Описание
Компонент для отображения профиля пользователя по студенческому коду. Используется в карусели администраторов и может быть использован для просмотра профилей других пользователей.

## Использование

### В TeamCarousel
```jsx
import UserProfileModal from './UserProfileModal.jsx';

function TeamCarousel({ teamMembers, darkMode }) {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedStudentCode, setSelectedStudentCode] = useState(null);

  const handleAvatarClick = (memberName) => {
    const studentCode = adminMapping[memberName];
    if (studentCode) {
      setSelectedStudentCode(studentCode);
      setIsProfileModalOpen(true);
    }
  };

  return (
    <div>
      {/* Карусель с аватарками */}
      <div onClick={() => handleAvatarClick(member.name)}>
        {/* Аватарка пользователя */}
      </div>
      
      {/* Модальное окно */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => {
          setIsProfileModalOpen(false);
          setSelectedStudentCode(null);
        }}
        studentCode={selectedStudentCode}
        darkMode={darkMode}
      />
    </div>
  );
}
```

## Администраторы в карусели
Компонент имеет встроенный маппинг имен администраторов на их студенческие коды:

- Свиридович Павел - 1090352523
- Смоленский Андрей - 1090372523
- Гончарик Александр - 1090352506
- Абраменко Александр - 1090352501
- Альшевский Алексей - 1030522501

## API Endpoint
Backend endpoint: `/api/user/by-code/<student_code>`

Метод: GET

Ответ:
```json
{
  "success": true,
  "user": {
    "id": 1,
    "fullname": "Имя пользователя",
    "student_code": "1090352523",
    "faculty": "Факультет",
    "created_at": 1234567890,
    "last_login": 1234567890,
    "status": "active",
    "is_admin": true,
    "is_banned": false,
    "avatar_url": "/media/avatars/user.jpg"
  }
}
```

## Особенности
- **Без настроек**: В отличие от обычного профиля, здесь нет кнопки настроек
- **Только просмотр**: Компонент предназначен только для просмотра информации
- **Автоматическое определение**: Если пользователь из карусели администраторов, автоматически определяется имя и статус администратора
- **Обработка ошибок**: Если пользователь не найден, показывается соответствующее сообщение

## Стили
Компонент использует те же стили, что и основной профиль пользователя:
- Аватар с градиентом
- Статусы (активен/заблокирован)
- Бейдж администратора
- Информация о пользователе в сетке
- Адаптивный дизайн для мобильных устройств
