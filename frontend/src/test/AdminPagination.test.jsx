import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import AdminPagination from '../components/admin/AdminPagination.jsx';

describe('AdminPagination', () => {
  it('does not render when only one page exists', () => {
    const { container } = render(
      <AdminPagination currentPage={1} totalPages={1} setCurrentPage={vi.fn()} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('shows the current page and navigates forward/backward', async () => {
    const user = userEvent.setup();
    const setCurrentPage = vi.fn();

    render(<AdminPagination currentPage={2} totalPages={5} setCurrentPage={setCurrentPage} />);

    expect(screen.getByText('Страница 2 из 5')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Предыдущая страница'));
    await user.click(screen.getByLabelText('Следующая страница'));

    expect(setCurrentPage).toHaveBeenCalledTimes(2);
    expect(setCurrentPage.mock.calls[0][0](2)).toBe(1);
    expect(setCurrentPage.mock.calls[1][0](2)).toBe(3);
  });

  it('disables buttons on boundaries', () => {
    render(<AdminPagination currentPage={1} totalPages={3} setCurrentPage={vi.fn()} />);

    expect(screen.getByLabelText('Предыдущая страница')).toBeDisabled();
    expect(screen.getByLabelText('Следующая страница')).not.toBeDisabled();
  });
});
