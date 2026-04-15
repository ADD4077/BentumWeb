/**
 * Рассчитывает текущий курс студента на основе номера студенческого билета
 * @param {string} studentCode - номер студенческого билета (минимум 8 символов)
 * @returns {string|null} - строка с курсом ("1 курс", "2 курс"...) или null если невалидный код
 * @example
 * calculateCourse('10701120') // "4 курс" (в зависимости от текущего года)
 */
export const calculateCourse = (studentCode) => {
  if (!studentCode || studentCode.length < 8) {
    return null;
  }

  // Извлекаем год поступления из 7-8 символов кода (например, "20" из "10701120")
  const groupLastTwo = studentCode.slice(6, 8);
  const groupYear = parseInt(groupLastTwo, 10) + 2000;
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11, сентябрь = 8
  
  // Рассчитываем курс
  let course = currentYear - groupYear + 1;
  
  // Корректировка: если сейчас до сентября, курс меньше на 1
  if (currentMonth < 8) {
    course--;
  }
  
  // Ограничиваем диапазон 1-5
  if (course <= 0) {
    course = 1;
  } else if (course > 5) {
    course = 5;
  }
  
  return `${course} курс`;
};

/**
 * Рассчитывает курс студента с fallback на дефолтное значение
 * @param {string} studentCode - номер студенческого билета
 * @param {string} defaultValue - значение по умолчанию
 * @returns {string} - курс или defaultValue
 */
export const calculateCourseOrDefault = (studentCode, defaultValue = 'Не указан') => {
  const course = calculateCourse(studentCode);
  return course || defaultValue;
};
