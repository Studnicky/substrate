import type { OrderRecordEntity } from '../entities/OrderRecordEntity.js';

export const OrdersFixture: { readonly 'orders': readonly OrderRecordEntity.Type[] } = {
  'orders': [
    { 'category': 'electronics', 'region': 'east', 'status': 'fulfilled' },
    { 'category': 'electronics', 'region': 'east', 'status': 'returned' },
    { 'category': 'electronics', 'region': 'west', 'status': 'fulfilled' },
    { 'category': 'apparel', 'region': 'east', 'status': 'fulfilled' },
    { 'category': 'apparel', 'region': 'west', 'status': 'fulfilled' },
    { 'category': 'apparel', 'region': 'west', 'status': 'returned' }
  ]
};
