import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import DeleteMediaModal from '../components/profile-settings/DeleteMediaModal.jsx';

describe('DeleteMediaModal', () => {
  it('does not render when no media type is selected', () => {
    const { container } = render(
      <DeleteMediaModal deleteModal={null} setDeleteModal={vi.fn()} confirmDelete={vi.fn()} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders avatar removal confirmation and actions', async () => {
    const user = userEvent.setup();
    const setDeleteModal = vi.fn();
    const confirmDelete = vi.fn();

    render(
      <DeleteMediaModal
        deleteModal="avatar"
        setDeleteModal={setDeleteModal}
        confirmDelete={confirmDelete}
      />
    );

    expect(screen.getByText('Удалить аватар?')).toBeInTheDocument();
    expect(screen.getByText('Это действие нельзя отменить.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Отмена' }));
    await user.click(screen.getByRole('button', { name: 'Удалить' }));

    expect(setDeleteModal).toHaveBeenCalledWith(null);
    expect(confirmDelete).toHaveBeenCalledTimes(1);
  });
});
