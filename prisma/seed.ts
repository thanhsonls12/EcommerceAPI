import { PrismaClient, UserStatus } from '../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import bcrypt from 'bcrypt'
import 'dotenv/config'

import { PermissionName } from '../src/shared/constants/permission.constant'
import { RoleName } from '../src/shared/constants/role.constant'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({ adapter })

const permissions = [
  {
    name: PermissionName.ProductCreate,
    description: 'Create product',
    path: '/products',
    method: 'POST' as const,
    module: 'PRODUCT',
  },
  {
    name: PermissionName.ProductRead,
    description: 'Read products',
    path: '/products',
    method: 'GET' as const,
    module: 'PRODUCT',
  },
  {
    name: PermissionName.ProductUpdate,
    description: 'Update product',
    path: '/products/:id',
    method: 'PATCH' as const,
    module: 'PRODUCT',
  },
  {
    name: PermissionName.ProductDelete,
    description: 'Delete product',
    path: '/products/:id',
    method: 'DELETE' as const,
    module: 'PRODUCT',
  },
  {
    name: PermissionName.CategoryCreate,
    description: 'Create category',
    path: '/categories',
    method: 'POST' as const,
    module: 'CATEGORY',
  },
  {
    name: PermissionName.CategoryRead,
    description: 'Read categories',
    path: '/categories',
    method: 'GET' as const,
    module: 'CATEGORY',
  },
  {
    name: PermissionName.CategoryUpdate,
    description: 'Update category',
    path: '/categories/:id',
    method: 'PATCH' as const,
    module: 'CATEGORY',
  },
  {
    name: PermissionName.CategoryDelete,
    description: 'Delete category',
    path: '/categories/:id',
    method: 'DELETE' as const,
    module: 'CATEGORY',
  },
  {
    name: PermissionName.OrderRead,
    description: 'Read orders',
    path: '/orders',
    method: 'GET' as const,
    module: 'ORDER',
  },
  {
    name: PermissionName.OrderUpdate,
    description: 'Update order',
    path: '/orders/:id',
    method: 'PATCH' as const,
    module: 'ORDER',
  },
  { name: PermissionName.UserRead, description: 'Read users', path: '/users', method: 'GET' as const, module: 'USER' },
  {
    name: PermissionName.UserUpdate,
    description: 'Update users',
    path: '/users/:id',
    method: 'PATCH' as const,
    module: 'USER',
  },
  {
    name: PermissionName.BrandCreate,
    description: 'Create brand',
    path: '/brands',
    method: 'POST' as const,
    module: 'BRAND',
  },
  {
    name: PermissionName.BrandRead,
    description: 'Read brands',
    path: '/brands',
    method: 'GET' as const,
    module: 'BRAND',
  },
  {
    name: PermissionName.BrandUpdate,
    description: 'Update brand',
    path: '/brands/:id',
    method: 'PATCH' as const,
    module: 'BRAND',
  },
  {
    name: PermissionName.BrandDelete,
    description: 'Delete brand',
    path: '/brands/:id',
    method: 'DELETE' as const,
    module: 'BRAND',
  },
]

async function main() {
  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: {
        description: permission.description,
        path: permission.path,
        method: permission.method,
        module: permission.module,
        deletedAt: null,
      },
      create: permission,
    })
  }

  const allPermissions = await prisma.permission.findMany({
    where: { deletedAt: null },
  })

  const adminRole = await prisma.role.upsert({
    where: { name: RoleName.Admin },
    update: { description: 'Administrator', isActive: true, deletedAt: null },
    create: { name: RoleName.Admin, description: 'Administrator', isActive: true },
  })

  const clientRole = await prisma.role.upsert({
    where: { name: RoleName.Client },
    update: { description: 'Customer', isActive: true, deletedAt: null },
    create: { name: RoleName.Client, description: 'Customer', isActive: true },
  })

  const sellerRole = await prisma.role.upsert({
    where: { name: RoleName.Seller },
    update: { description: 'Seller', isActive: true, deletedAt: null },
    create: { name: RoleName.Seller, description: 'Seller', isActive: true },
  })

  const permissionByName = new Map(allPermissions.map((permission) => [permission.name, permission]))

  const ids = (...names: string[]) =>
    names
      .map((name) => permissionByName.get(name))
      .filter((permission): permission is NonNullable<typeof permission> => Boolean(permission))
      .map((permission) => ({ id: permission.id }))

  await prisma.role.update({
    where: { id: adminRole.id },
    data: { permissions: { set: allPermissions.map((permission) => ({ id: permission.id })) } },
  })

  await prisma.role.update({
    where: { id: sellerRole.id },
    data: {
      permissions: {
        set: ids(
          PermissionName.ProductCreate,
          PermissionName.ProductRead,
          PermissionName.ProductUpdate,
          PermissionName.CategoryRead,
          PermissionName.BrandRead,
          PermissionName.OrderRead,
          PermissionName.OrderUpdate,
        ),
      },
    },
  })

  await prisma.role.update({
    where: { id: clientRole.id },
    data: {
      permissions: {
        set: ids(
          PermissionName.ProductRead,
          PermissionName.CategoryRead,
          PermissionName.BrandRead,
          PermissionName.OrderRead,
        ),
      },
    },
  })

  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD
  const adminName = process.env.ADMIN_NAME
  const adminPhoneNumber = process.env.ADMIN_PHONENUMBER

  if (!adminEmail || !adminPassword || !adminName || !adminPhoneNumber) {
    throw new Error('Missing ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME or ADMIN_PHONENUMBER in .env')
  }

  const hashedAdminPassword = await bcrypt.hash(adminPassword, 10)

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      phoneNumber: adminPhoneNumber,
      password: hashedAdminPassword,
      status: UserStatus.ACTIVE,
      roleId: adminRole.id,
      deletedAt: null,
    },
    create: {
      email: adminEmail,
      name: adminName,
      phoneNumber: adminPhoneNumber,
      password: hashedAdminPassword,
      status: UserStatus.ACTIVE,
      roleId: adminRole.id,
    },
  })

  const seedBrand = async (name: string, logo: string) => {
    const existingBrand = await prisma.brand.findFirst({
      where: { name },
    })

    if (existingBrand) {
      return prisma.brand.update({
        where: { id: existingBrand.id },
        data: {
          logo,
          deletedAt: null,
          deletedById: null,
          updatedById: adminUser.id,
        },
      })
    }

    return prisma.brand.create({
      data: {
        name,
        logo,
        createdById: adminUser.id,
      },
    })
  }

  const apple = await seedBrand('Apple', 'https://placehold.co/400x400?text=Apple')
  const samsung = await seedBrand('Samsung', 'https://placehold.co/400x400?text=Samsung')

  const seedCategory = async (name: string, parentCategoryId?: number) => {
    const existingCategory = await prisma.category.findFirst({
      where: {
        name,
        parentCategoryId: parentCategoryId ?? null,
      },
    })

    if (existingCategory) {
      return prisma.category.update({
        where: { id: existingCategory.id },
        data: {
          deletedAt: null,
          deletedById: null,
          updatedById: adminUser.id,
        },
      })
    }

    return prisma.category.create({
      data: {
        name,
        parentCategoryId,
        createdById: adminUser.id,
      },
    })
  }

  const electronics = await seedCategory('Electronics')
  const phones = await seedCategory('Phones', electronics.id)
  const laptops = await seedCategory('Laptops', electronics.id)

  const productSeeds = [
    ['iPhone 17 Pro', 28990000, 31990000, apple.id, phones.id],
    ['iPhone 17', 22990000, 24990000, apple.id, phones.id],
    ['iPhone 16 Pro Max', 30990000, 34990000, apple.id, phones.id],
    ['iPhone 16', 19990000, 22990000, apple.id, phones.id],
    ['iPhone 15', 16990000, 19990000, apple.id, phones.id],
    ['Samsung Galaxy S26 Ultra', 31990000, 34990000, samsung.id, phones.id],
    ['Samsung Galaxy S26', 23990000, 26990000, samsung.id, phones.id],
    ['Samsung Galaxy S25 Ultra', 27990000, 31990000, samsung.id, phones.id],
    ['Samsung Galaxy S25', 19990000, 22990000, samsung.id, phones.id],
    ['Samsung Galaxy A56', 9990000, 11990000, samsung.id, phones.id],
    ['MacBook Air M4 13', 26990000, 29990000, apple.id, laptops.id],
    ['MacBook Air M4 15', 31990000, 34990000, apple.id, laptops.id],
    ['MacBook Pro M5 14', 42990000, 46990000, apple.id, laptops.id],
    ['MacBook Pro M5 16', 62990000, 67990000, apple.id, laptops.id],
    ['Samsung Galaxy Book5 Pro', 34990000, 38990000, samsung.id, laptops.id],
    ['Samsung Galaxy Book5 360', 29990000, 33990000, samsung.id, laptops.id],
    ['Samsung Galaxy Book4', 21990000, 24990000, samsung.id, laptops.id],
    ['MacBook Air M3 13', 22990000, 25990000, apple.id, laptops.id],
    ['iPhone 15 Plus', 18990000, 21990000, apple.id, phones.id],
    ['Samsung Galaxy A36', 7990000, 9990000, samsung.id, phones.id],
    ['iPhone 14', 13990000, 16990000, apple.id, phones.id],
    ['Samsung Galaxy A26', 6490000, 7990000, samsung.id, phones.id],
    ['MacBook Air M2 13', 19990000, 22990000, apple.id, laptops.id],
    ['Samsung Galaxy Book4 Pro', 27990000, 31990000, samsung.id, laptops.id],
    ['iPhone 16 Plus', 21990000, 24990000, apple.id, phones.id],
    ['Samsung Galaxy S24 FE', 14990000, 17990000, samsung.id, phones.id],
    ['MacBook Pro M4 14', 38990000, 42990000, apple.id, laptops.id],
    ['Samsung Galaxy Book4 Edge', 25990000, 29990000, samsung.id, laptops.id],
    ['iPhone 16e', 16990000, 18990000, apple.id, phones.id],
    ['Samsung Galaxy Z Flip7', 25990000, 28990000, samsung.id, phones.id],
  ] as const

  let seededProducts = 0

  for (const [name, basePrice, virtualPrice, brandId, categoryId] of productSeeds) {
    const existingProduct = await prisma.product.findFirst({ where: { name } })
    const data = {
      basePrice,
      virtualPrice,
      brandId,
      images: [`https://placehold.co/800x800?text=${encodeURIComponent(name)}`],
      variants: [
        { name: 'Color', options: ['Black', 'White'] },
        { name: 'Storage', options: ['256GB', '512GB'] },
      ],
      deletedAt: null,
      deletedById: null,
      updatedById: adminUser.id,
    }

    if (existingProduct) {
      await prisma.product.update({
        where: { id: existingProduct.id },
        data: {
          ...data,
          categories: { set: [{ id: categoryId }] },
        },
      })
    } else {
      await prisma.product.create({
        data: {
          name,
          ...data,
          categories: { connect: [{ id: categoryId }] },
          createdById: adminUser.id,
        },
      })
    }

    seededProducts += 1
  }

  console.log(
    `Seeded ${allPermissions.length} permissions, 3 roles, 1 admin user, ` +
      `brands [${apple.id}, ${samsung.id}], categories [${electronics.id}, ${phones.id}, ${laptops.id}], ` +
      `${seededProducts} products.`,
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
