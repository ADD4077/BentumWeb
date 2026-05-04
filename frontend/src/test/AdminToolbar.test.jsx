import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import AdminToolbar from '../components/admin/AdminToolbar.jsx';

describe('AdminToolbar', () => {
  it('renders controls and triggers callbacks', async () => {
    const user = userEvent.setup();
    const refreshData = vi.fn();
    const openAddUserModal = vi.fn();
    const exportUsers = vi.fn();
    const resetFilters = vi.fn();
    const setSearchQuery = vi.fn();
    const setFilterStatus = vi.fn();
    const setFilterRole = vi.fn();
    const setFilterFaculty = vi.fn();
    const setSortBy = vi.fn();
    const setPeriodFilter = vi.fn();

    render(
      <AdminToolbar
        refreshing={false}
        refreshData={refreshData}
        openAddUserModal={openAddUserModal}
        exportUsers={exportUsers}
        resetFilters={resetFilters}
        searchQuery=""
        setSearchQuery={setSearchQuery}
        filterStatus="all"
        setFilterStatus={setFilterStatus}
        filterRole="all"
        setFilterRole={setFilterRole}
        filterFaculty="all"
        setFilterFaculty={setFilterFaculty}
        sortBy="newest"
        setSortBy={setSortBy}
        periodFilter="all"
        setPeriodFilter={setPeriodFilter}
        faculties={['ФИТР']}
        activeFiltersCount={0}
      />
    );

    expect(screen.getByText('Админ-панель')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Поиск по имени, номеру студбилета или email...')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Обновить' }));
    await user.click(screen.getByRole('button', { name: 'Добавить пользователя' }));
    await user.type(screen.getByPlaceholderText('Поиск по имени, номеру студбилета или email...'), 'Павел');
    await user.selectOptions(screen.getByLabelText('Фильтр статуса'), 'banned');
    await user.selectOptions(screen.getByLabelText('Сортировка пользователей'), 'name');

    expect(refreshData).toHaveBeenCalledTimes(1);
    expect(openAddUserModal).toHaveBeenCalledTimes(1);
    expect(setSearchQuery).toHaveBeenCalled();
    expect(setFilterStatus).toHaveBeenLastCalledWith('banned');
    expect(setSortBy).toHaveBeenLastCalledWith('name');
  });

  it('shows refreshing label when data is updating', () => {
    render(
      <AdminToolbar
        refreshing
        refreshData={vi.fn()}
        openAddUserModal={vi.fn()}
        exportUsers={vi.fn()}
        resetFilters={vi.fn()}
        searchQuery=""
        setSearchQuery={vi.fn()}
        filterStatus="all"
        setFilterStatus={vi.fn()}
        filterRole="all"
        setFilterRole={vi.fn()}
        filterFaculty="all"
        setFilterFaculty={vi.fn()}
        sortBy="newest"
        setSortBy={vi.fn()}
        periodFilter="all"
        setPeriodFilter={vi.fn()}
        faculties={[]}
        activeFiltersCount={0}
      />
    );

    expect(screen.getByRole('button', { name: 'Обновление...' })).toBeInTheDocument();
  });
});
