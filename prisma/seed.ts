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

  await prisma.user.upsert({
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

  console.log(`Seeded ${allPermissions.length} permissions, 3 roles, and 1 admin user.`)
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
