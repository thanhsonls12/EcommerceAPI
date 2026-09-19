import {
  DiscountType,
  InventoryTransactionType,
  NotificationType,
  OrderStatus,
  PaymentStatus,
  Prisma,
  PrismaClient,
  UserStatus,
} from '../generated/prisma/client'
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
  {
    name: PermissionName.PromotionCreate,
    description: 'Create promotion',
    path: '/promotions',
    method: 'POST' as const,
    module: 'PROMOTION',
  },
  {
    name: PermissionName.PromotionRead,
    description: 'Read promotions',
    path: '/promotions',
    method: 'GET' as const,
    module: 'PROMOTION',
  },
  {
    name: PermissionName.PromotionUpdate,
    description: 'Update promotion',
    path: '/promotions/:id',
    method: 'PATCH' as const,
    module: 'PROMOTION',
  },
  {
    name: PermissionName.PromotionDelete,
    description: 'Delete promotion',
    path: '/promotions/:id',
    method: 'DELETE' as const,
    module: 'PROMOTION',
  },
  {
    name: PermissionName.InventoryRead,
    description: 'Read inventory',
    path: '/inventory',
    method: 'GET' as const,
    module: 'INVENTORY',
  },
  {
    name: PermissionName.InventoryUpdate,
    description: 'Adjust inventory',
    path: '/inventory/adjustments',
    method: 'POST' as const,
    module: 'INVENTORY',
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
          PermissionName.InventoryRead,
          PermissionName.InventoryUpdate,
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

  const demoPassword = process.env.DEMO_USER_PASSWORD ?? 'Demo@123456'
  const hashedDemoPassword = await bcrypt.hash(demoPassword, 10)

  const seedUser = async (email: string, name: string, phoneNumber: string, roleId: number) =>
    prisma.user.upsert({
      where: { email },
      update: {
        name,
        phoneNumber,
        password: hashedDemoPassword,
        status: UserStatus.ACTIVE,
        roleId,
        deletedAt: null,
      },
      create: {
        email,
        name,
        phoneNumber,
        password: hashedDemoPassword,
        status: UserStatus.ACTIVE,
        roleId,
      },
    })

  const sellerUser = await seedUser('seller.demo@example.com', 'Demo Seller', '0900000001', sellerRole.id)
  const clientUser = await seedUser('client.demo@example.com', 'Demo Customer', '0900000002', clientRole.id)

  await prisma.language.upsert({
    where: { id: 'vi' },
    update: { name: 'Tiếng Việt', deletedAt: null, updatedById: adminUser.id },
    create: { id: 'vi', name: 'Tiếng Việt', createdById: adminUser.id },
  })
  await prisma.language.upsert({
    where: { id: 'en' },
    update: { name: 'English', deletedAt: null, updatedById: adminUser.id },
    create: { id: 'en', name: 'English', createdById: adminUser.id },
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
  const logitech = await seedBrand('Logitech', 'https://placehold.co/400x400?text=Logitech')
  const sony = await seedBrand('Sony', 'https://placehold.co/400x400?text=Sony')

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
  const accessories = await seedCategory('Accessories', electronics.id)
  const audio = await seedCategory('Audio', electronics.id)

  for (const [brand, viName, description] of [
    [apple, 'Apple', 'Thiết bị và phụ kiện Apple'],
    [samsung, 'Samsung', 'Thiết bị điện tử Samsung'],
    [logitech, 'Logitech', 'Phụ kiện máy tính Logitech'],
    [sony, 'Sony', 'Thiết bị âm thanh Sony'],
  ] as const) {
    for (const languageId of ['vi', 'en'] as const) {
      await prisma.brandTranslation.upsert({
        where: { brandId_languageId: { brandId: brand.id, languageId } },
        update: { name: viName, description, deletedAt: null, updatedById: adminUser.id },
        create: { brandId: brand.id, languageId, name: viName, description, createdById: adminUser.id },
      })
    }
  }

  for (const category of [electronics, phones, laptops, accessories, audio]) {
    for (const languageId of ['vi', 'en'] as const) {
      await prisma.categoryTranslation.upsert({
        where: { categoryId_languageId: { categoryId: category.id, languageId } },
        update: {
          name: category.name,
          description: `Seeded ${category.name} category`,
          deletedAt: null,
          updatedById: adminUser.id,
        },
        create: {
          categoryId: category.id,
          languageId,
          name: category.name,
          description: `Seeded ${category.name} category`,
          createdById: adminUser.id,
        },
      })
    }
  }

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
    ['Logitech MX Master 4', 2990000, 3490000, logitech.id, accessories.id],
    ['Logitech MX Keys S', 2590000, 2990000, logitech.id, accessories.id],
    ['Sony WH-1000XM6', 8990000, 9990000, sony.id, audio.id],
    ['Sony WF-1000XM6', 5990000, 6990000, sony.id, audio.id],
  ] as const

  let seededProducts = 0
  let seededSkus = 0

  const buildSeedVariantData = (name: string, categoryId: number, basePrice: number) => {
    if (categoryId === phones.id) {
      return {
        variants: [
          { name: 'Color', options: ['Black', 'White'] },
          { name: 'Storage', options: ['256GB', '512GB'] },
        ],
        skus: [
          { value: { Color: 'Black', Storage: '256GB' }, price: basePrice, stock: 30 },
          { value: { Color: 'White', Storage: '256GB' }, price: basePrice + 500000, stock: 22 },
          { value: { Color: 'Black', Storage: '512GB' }, price: basePrice + 2500000, stock: 16 },
          { value: { Color: 'White', Storage: '512GB' }, price: basePrice + 3000000, stock: 12 },
        ],
      }
    }

    if (categoryId === laptops.id) {
      return {
        variants: [
          { name: 'Memory', options: ['16GB', '32GB'] },
          { name: 'Storage', options: ['512GB', '1TB'] },
        ],
        skus: [
          { value: { Memory: '16GB', Storage: '512GB' }, price: basePrice, stock: 18 },
          { value: { Memory: '16GB', Storage: '1TB' }, price: basePrice + 3000000, stock: 14 },
          { value: { Memory: '32GB', Storage: '512GB' }, price: basePrice + 4500000, stock: 10 },
          { value: { Memory: '32GB', Storage: '1TB' }, price: basePrice + 7500000, stock: 8 },
        ],
      }
    }

    if (name.includes('MX Master')) {
      return {
        variants: [{ name: 'Color', options: ['Graphite', 'Pale Grey', 'Black', 'White'] }],
        skus: [
          { value: { Color: 'Graphite' }, price: basePrice, stock: 35 },
          { value: { Color: 'Pale Grey' }, price: basePrice, stock: 24 },
          { value: { Color: 'Black' }, price: basePrice + 100000, stock: 28 },
          { value: { Color: 'White' }, price: basePrice + 100000, stock: 20 },
        ],
      }
    }

    if (name.includes('MX Keys')) {
      return {
        variants: [
          { name: 'Color', options: ['Graphite', 'Pale Grey'] },
          { name: 'Layout', options: ['US', 'UK'] },
        ],
        skus: [
          { value: { Color: 'Graphite', Layout: 'US' }, price: basePrice, stock: 26 },
          { value: { Color: 'Graphite', Layout: 'UK' }, price: basePrice + 100000, stock: 17 },
          { value: { Color: 'Pale Grey', Layout: 'US' }, price: basePrice, stock: 21 },
          { value: { Color: 'Pale Grey', Layout: 'UK' }, price: basePrice + 100000, stock: 13 },
        ],
      }
    }

    return {
      variants: [{ name: 'Color', options: ['Black', 'Silver', 'Blue', 'White'] }],
      skus: [
        { value: { Color: 'Black' }, price: basePrice, stock: 32 },
        { value: { Color: 'Silver' }, price: basePrice, stock: 20 },
        { value: { Color: 'Blue' }, price: basePrice + 200000, stock: 18 },
        { value: { Color: 'White' }, price: basePrice + 200000, stock: 15 },
      ],
    }
  }

  const buildCatalogDetails = (name: string, brandId: number, categoryId: number) => {
    const brandName =
      brandId === apple.id
        ? 'Apple'
        : brandId === samsung.id
          ? 'Samsung'
          : brandId === logitech.id
            ? 'Logitech'
            : 'Sony'
    const imageLabel = encodeURIComponent(name)
    const images = [
      `https://placehold.co/1200x1200/f4f1eb/1d2433?text=${imageLabel}`,
      `https://placehold.co/1200x1200/e9eefb/2b4f9e?text=${encodeURIComponent(`${name} Detail`)}`,
      `https://placehold.co/1200x1200/1d2433/f8f7f3?text=${encodeURIComponent(`${name} Lifestyle`)}`,
    ]

    if (categoryId === phones.id) {
      return {
        images,
        descriptionVi: `${name} là mẫu điện thoại ${brandName} trong dữ liệu demo của Élan, hướng tới trải nghiệm hằng ngày cân bằng giữa thiết kế, hiệu năng và khả năng lưu trữ.`,
        descriptionEn: `${name} is a ${brandName} smartphone in the Élan demo catalog, designed to showcase a balanced everyday mobile experience.`,
        highlights: [
          'Thiết kế cao cấp, phù hợp sử dụng hằng ngày',
          'Nhiều tùy chọn màu sắc và dung lượng lưu trữ',
          'Tối ưu cho liên lạc, giải trí và công việc di động',
          'Dữ liệu tồn kho được quản lý riêng theo từng SKU',
        ],
        specifications: {
          'Thương hiệu': brandName,
          'Danh mục': 'Điện thoại',
          'Tùy chọn lưu trữ': '256GB / 512GB',
          'Tùy chọn màu': 'Black / White',
          'Tình trạng': 'Mới - dữ liệu demo',
          'Bảo hành': '12 tháng (demo)',
        },
      }
    }

    if (categoryId === laptops.id) {
      return {
        images,
        descriptionVi: `${name} là mẫu laptop ${brandName} trong catalog demo, phù hợp cho học tập, công việc và các tác vụ đa nhiệm với nhiều cấu hình bộ nhớ và lưu trữ.`,
        descriptionEn: `${name} is a ${brandName} laptop in the demo catalog, presented for study, work and multitasking use cases.`,
        highlights: [
          'Thiết kế gọn gàng cho học tập và công việc',
          'Có nhiều cấu hình RAM và dung lượng lưu trữ',
          'Phù hợp tác vụ văn phòng và đa nhiệm hằng ngày',
          'Giá và tồn kho được quản lý theo từng cấu hình SKU',
        ],
        specifications: {
          'Thương hiệu': brandName,
          'Danh mục': 'Laptop',
          'Bộ nhớ': '16GB / 32GB',
          'Lưu trữ': '512GB / 1TB',
          'Tình trạng': 'Mới - dữ liệu demo',
          'Bảo hành': '12 tháng (demo)',
        },
      }
    }

    if (categoryId === accessories.id) {
      return {
        images,
        descriptionVi: `${name} là phụ kiện ${brandName} trong catalog demo, được xây dựng để minh họa đầy đủ lựa chọn phiên bản, tồn kho và trải nghiệm mua phụ kiện trên storefront.`,
        descriptionEn: `${name} is a ${brandName} accessory used to demonstrate variants, inventory and accessory shopping flows.`,
        highlights: [
          'Thiết kế hướng tới sử dụng lâu dài',
          'Nhiều tùy chọn phiên bản phù hợp nhu cầu cá nhân',
          'Tồn kho độc lập theo từng SKU',
          'Phù hợp setup làm việc và học tập hiện đại',
        ],
        specifications: {
          'Thương hiệu': brandName,
          'Danh mục': 'Phụ kiện',
          'Kết nối': 'Không dây / đa thiết bị (demo)',
          'Màu sắc': name.includes('MX Keys') ? 'Graphite / Pale Grey' : 'Graphite / Pale Grey / Black / White',
          'Tình trạng': 'Mới - dữ liệu demo',
          'Bảo hành': '12 tháng (demo)',
        },
      }
    }

    return {
      images,
      descriptionVi: `${name} là thiết bị âm thanh ${brandName} trong catalog demo, phục vụ trải nghiệm nghe nhạc và làm việc với nhiều tùy chọn màu sắc.`,
      descriptionEn: `${name} is a ${brandName} audio device in the demo catalog, presented for music and everyday productivity scenarios.`,
      highlights: [
        'Thiết kế tối giản, phù hợp sử dụng hằng ngày',
        'Nhiều tùy chọn màu sắc',
        'Phù hợp nghe nhạc, gọi thoại và làm việc',
        'Tồn kho và giá bán được quản lý theo SKU',
      ],
      specifications: {
        'Thương hiệu': brandName,
        'Danh mục': 'Âm thanh',
        'Kết nối': 'Không dây (demo)',
        'Màu sắc': 'Black / Silver / Blue / White',
        'Tình trạng': 'Mới - dữ liệu demo',
        'Bảo hành': '12 tháng (demo)',
      },
    }
  }

  for (const [name, basePrice, virtualPrice, brandId, categoryId] of productSeeds) {
    const existingProduct = await prisma.product.findFirst({ where: { name } })
    const variantData = buildSeedVariantData(name, categoryId, basePrice)
    const catalogDetails = buildCatalogDetails(name, brandId, categoryId)
    const data = {
      basePrice,
      virtualPrice,
      brandId,
      images: catalogDetails.images,
      highlights: catalogDetails.highlights,
      specifications: catalogDetails.specifications,
      variants: variantData.variants,
      deletedAt: null,
      deletedById: null,
      updatedById: adminUser.id,
    }

    const product = existingProduct
      ? await prisma.product.update({
          where: { id: existingProduct.id },
          data: {
            ...data,
            categories: { set: [{ id: categoryId }] },
          },
        })
      : await prisma.product.create({
          data: {
            name,
            ...data,
            categories: { connect: [{ id: categoryId }] },
            createdById: adminUser.id,
          },
        })

    for (const languageId of ['vi', 'en'] as const) {
      await prisma.productTranslation.upsert({
        where: { productId_languageId: { productId: product.id, languageId } },
        update: {
          name: product.name,
          description: languageId === 'vi' ? catalogDetails.descriptionVi : catalogDetails.descriptionEn,
          deletedAt: null,
          updatedById: adminUser.id,
        },
        create: {
          productId: product.id,
          languageId,
          name: product.name,
          description: languageId === 'vi' ? catalogDetails.descriptionVi : catalogDetails.descriptionEn,
          createdById: adminUser.id,
        },
      })
    }

    const currentSkus = await prisma.sku.findMany({ where: { productId: product.id }, orderBy: { id: 'asc' } })
    for (const [skuIndex, skuSeed] of variantData.skus.entries()) {
      const existingSku = currentSkus[skuIndex]
      const image = `https://placehold.co/1000x1000/f4f1eb/1d2433?text=${encodeURIComponent(`${name} ${Object.values(skuSeed.value).join(' ')}`)}`
      const sku = existingSku
        ? await prisma.sku.update({
            where: { id: existingSku.id },
            data: {
              value: skuSeed.value,
              price: skuSeed.price,
              stock: skuSeed.stock,
              image,
              deletedAt: null,
              deletedById: null,
              updatedById: adminUser.id,
            },
          })
        : await prisma.sku.create({
            data: {
              productId: product.id,
              value: skuSeed.value,
              price: skuSeed.price,
              stock: skuSeed.stock,
              image,
              createdById: adminUser.id,
            },
          })

      const seedInventoryNote = 'Initial demo inventory seed'
      const inventoryExists = await prisma.inventoryTransaction.findFirst({
        where: { skuId: sku.id, type: InventoryTransactionType.RESTOCK, note: seedInventoryNote },
      })
      if (inventoryExists) {
        await prisma.inventoryTransaction.update({
          where: { id: inventoryExists.id },
          data: {
            quantity: sku.stock,
            stockBefore: 0,
            stockAfter: sku.stock,
          },
        })
      } else {
        await prisma.inventoryTransaction.create({
          data: {
            skuId: sku.id,
            type: InventoryTransactionType.RESTOCK,
            quantity: sku.stock,
            stockBefore: 0,
            stockAfter: sku.stock,
            note: seedInventoryNote,
            createdById: adminUser.id,
          },
        })
      }

      seededSkus += 1
    }

    for (const url of catalogDetails.images) {
      const mediaExists = await prisma.productMedia.findFirst({ where: { productId: product.id, url } })
      if (!mediaExists) {
        await prisma.productMedia.create({ data: { productId: product.id, url, type: 'IMAGE' } })
      }
    }

    seededProducts += 1
  }

  const now = new Date()
  const month = 30 * 24 * 60 * 60 * 1000
  const promotionSeeds = [
    {
      code: 'WELCOME10',
      name: 'Welcome 10%',
      description: '10% off for demo checkout',
      type: DiscountType.PERCENT,
      value: 10,
      minOrderValue: 500000,
      maxDiscount: 2000000,
      usageLimit: 1000,
    },
    {
      code: 'SAVE500K',
      name: 'Save 500K',
      description: '500,000 VND fixed discount',
      type: DiscountType.FIXED,
      value: 500000,
      minOrderValue: 5000000,
      maxDiscount: null,
      usageLimit: 500,
    },
  ]

  for (const promotion of promotionSeeds) {
    await prisma.promotion.upsert({
      where: { code: promotion.code },
      update: {
        ...promotion,
        startsAt: new Date(now.getTime() - month),
        expiresAt: new Date(now.getTime() + 12 * month),
        isActive: true,
        deletedAt: null,
      },
      create: {
        ...promotion,
        startsAt: new Date(now.getTime() - month),
        expiresAt: new Date(now.getTime() + 12 * month),
        isActive: true,
      },
    })
  }

  const addressSeeds = [
    {
      name: 'Demo Customer',
      phoneNumber: '0900000002',
      address: '1 Demo Street, Hanoi',
      note: 'Home',
      isDefault: true,
    },
    {
      name: 'Demo Customer',
      phoneNumber: '0900000002',
      address: '99 Test Avenue, Hanoi',
      note: 'Office',
      isDefault: false,
    },
  ]
  for (const addressSeed of addressSeeds) {
    const existing = await prisma.address.findFirst({ where: { userId: clientUser.id, address: addressSeed.address } })
    if (existing) {
      await prisma.address.update({ where: { id: existing.id }, data: { ...addressSeed, deletedAt: null } })
    } else {
      await prisma.address.create({ data: { userId: clientUser.id, ...addressSeed } })
    }
  }

  const firstSkus = await prisma.sku.findMany({
    where: { deletedAt: null },
    orderBy: { id: 'asc' },
    take: 3,
  })
  for (const [index, sku] of firstSkus.entries()) {
    await prisma.cartItem.upsert({
      where: { userId_skuId: { userId: clientUser.id, skuId: sku.id } },
      update: { quantity: index + 1 },
      create: { userId: clientUser.id, skuId: sku.id, quantity: index + 1 },
    })
  }

  const sampleSku = firstSkus[0]
  const sampleProduct = sampleSku ? await prisma.product.findUnique({ where: { id: sampleSku.productId } }) : null
  const sampleAddress = await prisma.address.findFirst({
    where: { userId: clientUser.id, isDefault: true, deletedAt: null },
  })

  let demoOrder = await prisma.order.findFirst({
    where: { userId: clientUser.id, receiver: { path: ['seedKey'], equals: 'demo-delivered-order' } },
  })

  if (sampleSku && sampleProduct && sampleAddress && !demoOrder) {
    const payment = await prisma.payment.create({
      data: {
        status: PaymentStatus.SUCCESS,
        amount: sampleSku.price,
        gateway: 'SEED',
        reference: `seed-${clientUser.id}-delivered`,
      },
    })

    demoOrder = await prisma.order.create({
      data: {
        userId: clientUser.id,
        status: OrderStatus.DELIVERED,
        receiver: {
          seedKey: 'demo-delivered-order',
          name: sampleAddress.name,
          phoneNumber: sampleAddress.phoneNumber,
          address: sampleAddress.address,
          note: sampleAddress.note,
        },
        subtotal: sampleSku.price,
        total: sampleSku.price,
        discount: 0,
        paymentId: payment.id,
        createdById: clientUser.id,
        products: { connect: [{ id: sampleProduct.id }] },
        items: {
          create: {
            productName: sampleProduct.name,
            skuPrice: sampleSku.price,
            image: sampleSku.image,
            skuValue: sampleSku.value as Prisma.InputJsonValue,
            skuId: sampleSku.id,
            quantity: 1,
            productId: sampleProduct.id,
            productTranslations: [],
          },
        },
      },
    })

    await prisma.paymentTransaction.create({
      data: {
        paymentId: payment.id,
        gateway: 'SEED',
        amountIn: Number(sampleSku.price),
        referenceNumber: `seed-txn-${payment.id}`,
        transactionContent: `Demo payment for order ${demoOrder.id}`,
      },
    })
  }

  if (demoOrder && sampleProduct) {
    await prisma.review.upsert({
      where: { orderId_productId: { orderId: demoOrder.id, productId: sampleProduct.id } },
      update: { rating: 5, content: 'Great demo product!', deletedAt: null },
      create: {
        orderId: demoOrder.id,
        productId: sampleProduct.id,
        userId: clientUser.id,
        rating: 5,
        content: 'Great demo product!',
      },
    })
  }

  const notificationExists = await prisma.notification.findFirst({
    where: { userId: clientUser.id, title: 'Welcome to Ecommerce Demo' },
  })
  if (!notificationExists) {
    await prisma.notification.create({
      data: {
        userId: clientUser.id,
        type: NotificationType.SYSTEM,
        title: 'Welcome to Ecommerce Demo',
        content: 'Your demo account is ready for end-to-end testing.',
        data: { source: 'seed' },
      },
    })
  }

  const messageExists = await prisma.message.findFirst({
    where: { fromUserId: sellerUser.id, toUserId: clientUser.id, content: 'Welcome to the demo store!' },
  })
  if (!messageExists) {
    await prisma.message.create({
      data: { fromUserId: sellerUser.id, toUserId: clientUser.id, content: 'Welcome to the demo store!' },
    })
  }

  console.log(
    `Seeded ${allPermissions.length} permissions, 3 roles, 1 admin user, ` +
      `4 brands, 5 categories, ${seededProducts} products, ${seededSkus} SKUs, inventory history, ` +
      `2 promotions, demo users, addresses, cart, order/payment/review, notification and message data.`,
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
