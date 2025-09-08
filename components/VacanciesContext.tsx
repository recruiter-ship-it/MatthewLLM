import React from 'react';
import { Vacancy } from '../types';

// Определяем структуру нашего контекста
interface IVacanciesContext {
  vacancies: Vacancy[];
  dispatch: React.Dispatch<any>; // 'any' для простоты, можно заменить на типизированный VacancyAction
  viewVacancy: (vacancy: Vacancy) => void;
  openVacancyModal: (vacancy: Vacancy | null) => void;
}

// Создаем контекст с начальными значениями по умолчанию
export const VacanciesContext = React.createContext<IVacanciesContext>({
  vacancies: [],
  dispatch: () => null,
  viewVacancy: () => {},
  openVacancyModal: () => {},
});
