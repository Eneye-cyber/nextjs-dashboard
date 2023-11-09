const { PrismaClient } = require("@prisma/client");
const {
  users,
  invoices,
  customers,
  revenue,
} = require('../app/lib/placeholder-data.js');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function seedUsers() {
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const hashedPassword = await bcrypt.hash(user.password, 10);

    try {
      await prisma.users.create({
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          password: hashedPassword
        },
      });
    } catch(e) {
      throw new Error(e)
    }
  }
}

async function seedInvoices() {
  for (let i = 0; i < invoices.length; i++) {
    const invoice = invoices[i];
    const date = new Date(invoice.date)
    try {
      await prisma.invoices.create({
        data: {
          customer_id: invoice.customer_id,
          amount: invoice.amount,
          image_url: invoice.image_url,
          status: invoice.status,
          date: date.toISOString()
        },
      });
    } catch(e) {
      throw new Error(e)
    }
  }
}

async function seedCustomers() {
  for (let i = 0; i < customers.length; i++) {
    const customer = customers[i];

    try {
      await prisma.customers.create({
        data: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          image_url: customer.image_url
        },
      });
    } catch(e) {
      throw new Error(e)
    }
  }
}

async function seedRevenue() {
  for (let i = 0; i < revenue.length; i++) {
    const rev = revenue[i];

    try {
      await prisma.revenue.create({
        data: {
          month: rev.month,
          revenue: rev.revenue,
        },
      });
    } catch(e) {
      throw new Error(e)
    }
  }
}

async function main() {
  
  await seedUsers();
  await seedCustomers();
  await seedInvoices();
  await seedRevenue();
}

main().catch((err) => {
  console.error(
    'An error occurred while attempting to seed the database:',
    err,
  );
});