import minecraftBanner from '../assets/games/Minecraft/banner.webp';

export const gamesData = [
  {
    id: 0,
    title: 'Minecraft Server',
    developer: 'BNTU Community',
    category: 'survival',
    price: 0,
    originalPrice: null,
    discount: 0,
    rating: 4.9,
    image: minecraftBanner,
    description:
      'Официальный Minecraft-сервер студентов БНТУ: выживание, мини-игры и живое комьюнити, куда можно зайти после пар.',
    tags: ['Выживание', 'Мультиплеер', 'Бесплатно', 'Сообщество'],
    featured: true,
    serverUrl: 'https://serverbntu.ru/',
    serverIP: 'serverbntu.ru',
  },
];

export const gameCategories = [
  { id: 'all', name: 'Все проекты' },
  { id: 'survival', name: 'Серверы' },
];
