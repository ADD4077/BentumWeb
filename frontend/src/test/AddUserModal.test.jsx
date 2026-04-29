import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import AddUserModal from '../components/AddUserModal.jsx';

describe('AddUserModal', () => {
  it('does not render when closed', () => {
    const { container } = render(
      <AddUserModal isOpen={false} onClose={vi.fn()} onAddUser={vi.fn()} darkMode={false} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('submits valid user data and does not expose administrator role', async () => {
    const user = userEvent.setup();
    const onAddUser = vi.fn().mockResolvedValue({});
    const onClose = vi.fn();

    render(
      <AddUserModal isOpen onClose={onClose} onAddUser={onAddUser} darkMode={false} />
    );

    const roleSelect = screen.getByLabelText('Роль *');
    expect(screen.queryByRole('option', { name: 'Администратор' })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Полное имя *'), 'Свиридович Павел');
    await user.type(screen.getByLabelText('Код студента *'), '1234567890');
    await user.selectOptions(screen.getByLabelText('Факультет *'), 'ФИТР');
    await user.selectOptions(roleSelect, 'teacher');
    await user.type(screen.getByLabelText('Пароль *'), 'password7');
    await user.type(screen.getByLabelText('Подтверждение пароля *'), 'password7');
    await user.click(screen.getByRole('button', { name: 'Добавить пользователя' }));

    await waitFor(() => {
      expect(onAddUser).toHaveBeenCalledTimes(1);
    });

    expect(onAddUser).toHaveBeenCalledWith(
      expect.objectContaining({
        fullname: 'Свиридович Павел',
        student_code: '1234567890',
        faculty: 'ФИТР',
        role: 'teacher',
        password: 'password7',
      })
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows validation error when passwords do not match', async () => {
    const user = userEvent.setup();
    const onAddUser = vi.fn();

    render(
      <AddUserModal isOpen onClose={vi.fn()} onAddUser={onAddUser} darkMode={false} />
    );

    await user.type(screen.getByLabelText('Полное имя *'), 'Свиридович Павел');
    await user.type(screen.getByLabelText('Код студента *'), '1234567890');
    await user.selectOptions(screen.getByLabelText('Факультет *'), 'ФИТР');
    await user.type(screen.getByLabelText('Пароль *'), 'password7');
    await user.type(screen.getByLabelText('Подтверждение пароля *'), 'password8');
    await user.click(screen.getByRole('button', { name: 'Добавить пользователя' }));

    expect(await screen.findByText('Пароли не совпадают')).toBeInTheDocument();
    expect(onAddUser).not.toHaveBeenCalled();
  });
});
