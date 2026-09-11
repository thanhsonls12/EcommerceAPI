export const PermissionName = {
  ProductCreate: 'PRODUCT_CREATE',
  ProductRead: 'PRODUCT_READ',
  ProductUpdate: 'PRODUCT_UPDATE',
  ProductDelete: 'PRODUCT_DELETE',

  CategoryCreate: 'CATEGORY_CREATE',
  CategoryRead: 'CATEGORY_READ',
  CategoryUpdate: 'CATEGORY_UPDATE',
  CategoryDelete: 'CATEGORY_DELETE',

  BrandCreate: 'BRAND_CREATE',
  BrandRead: 'BRAND_READ',
  BrandUpdate: 'BRAND_UPDATE',
  BrandDelete: 'BRAND_DELETE',

  OrderRead: 'ORDER_READ',
  OrderUpdate: 'ORDER_UPDATE',

  UserRead: 'USER_READ',
  UserUpdate: 'USER_UPDATE',
} as const

export type PermissionNameType = (typeof PermissionName)[keyof typeof PermissionName]
