const { PrismaClient } = require('@prisma/client');
import {
  CustomerField,
  CustomersTable,
  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
  User,
  Revenue,
} from './definitions';
import { formatCurrency } from './utils';

const prisma = new PrismaClient();

export async function fetchRevenue() {
  // Add noStore() here prevent the response from being cached.
  // This is equivalent to in fetch(..., {cache: 'no-store'}).

  try {
    // Artificially delay a reponse for demo purposes.
    // Don't do this in real life :)

    // console.log('Fetching revenue data...');
    // await new Promise((resolve) => setTimeout(resolve, 6000));

    const data = await prisma.revenue.findMany();

    // console.log('Data fetch complete after 6 seconds.');

    return data;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch revenue data.'); 
  }
}

export async function fetchLatestInvoices() {
  try {
    // const data = await sql<LatestInvoiceRaw>`
    //   SELECT invoices.amount, customers.name, customers.image_url, customers.email, invoices.id
    //   FROM invoices
    //   JOIN customers ON invoices.customer_id = customers.id
    //   ORDER BY invoices.date DESC
    //   LIMIT 5`;
    const data = await prisma.invoices.findMany({
      orderBy: {
        date: 'desc'
      },
      select: {
        id: true,
        amount: true,
        Customer: {
          select: {
            image_url: true,
            name: true,
            email: true,
          }
        }
      },
      take: 5,
    })
    interface Invoice {
      id: Number,
      amount: String,
      Customer: {
        name: String,
        image_url: String,
        email: String
      },
    }
    
    const latestInvoices = data.map((invoice: Invoice) => ({
      id: invoice.id,
      amount: invoice.amount,
      name: invoice.Customer.name,
      image_url: invoice.Customer.image_url,
      email: invoice.Customer.email,
    }));

    return latestInvoices;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the latest invoices.');
  }
}

export async function fetchCardData() {
  try {
    // You can probably combine these into a single SQL query
    // However, we are intentionally splitting them to demonstrate
    // how to initialize multiple queries in parallel with JS.
    const invoiceCountPromise = await prisma.invoices.count();
    const customerCountPromise = await prisma.customers.count();
    const invoiceStatusPromise = await prisma.$queryRaw`SELECT
         SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS "paid",
         SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS "pending"
         FROM "Invoices"`;

    const data = await Promise.all([
      invoiceCountPromise,
      customerCountPromise,
      invoiceStatusPromise,
    ]);
    // console.log(data)
    const numberOfInvoices = Number(data[0] ?? '0');
    const numberOfCustomers = Number(data[1] ?? '0');
    const totalPaidInvoices = formatCurrency(Number(data[2][0].paid) ?? '0');
    const totalPendingInvoices = formatCurrency(Number(data[2][0].pending) ?? '0');

    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to card data.');
  }
}

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number,
) {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {
    
    const invoices: InvoicesTable = await prisma.$queryRaw`
      SELECT
        Invoices.id,
        Invoices.amount,
        Invoices.date,
        Invoices.status,
        Customers.name,
        Customers.email,
        Customers.image_url
      FROM "Invoices" AS Invoices
      JOIN "Customers" AS Customers ON Invoices.customer_id = Customers.id
      WHERE
        Customers.name ILIKE ${`%${query}%`} OR
        Customers.email ILIKE ${`%${query}%`} OR
        Invoices.amount::text ILIKE ${`%${query}%`} OR
        Invoices.date::text ILIKE ${`%${query}%`} OR
        Invoices.status ILIKE ${`%${query}%`}
      ORDER BY Invoices.date DESC
      LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
    `;

    return invoices;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoices.');
  }
}

export async function fetchInvoicesPages(query: string) {
  try {
    const count = await prisma.$queryRaw`SELECT COUNT(*)
    FROM "Invoices" AS invoices
    JOIN "Customers" AS customers  ON invoices.customer_id = customers.id
    WHERE
      customers.name ILIKE ${`%${query}%`} OR
      customers.email ILIKE ${`%${query}%`} OR
      invoices.amount::text ILIKE ${`%${query}%`} OR
      invoices.date::text ILIKE ${`%${query}%`} OR
      invoices.status ILIKE ${`%${query}%`}
  `;
    const totalPages = Math.ceil(Number(count[0].count) / ITEMS_PER_PAGE);
    return totalPages;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch total number of invoices.');
  }
}

export async function fetchInvoiceById(id: string) {
  try {
    const data : InvoiceForm = await prisma.invoices.findUnique({
      where: {
        id: Number(id),
      },
      select:{
        id: true,
        customer_id: true,
        amount: true,
        status: true
      }
    });

    const invoice = {
      ...data,
      // Convert amount from cents to dollars
      amount: data.amount / 100,
    };

    return invoice;
  } catch (error) {
    console.error('Database Error:', error);
  }
}

export async function fetchCustomers() {
  try {
    const data: CustomerField[] = await prisma.customers.findMany({
      select: {
        id: true,
        name: true
      },
      orderBy: {
        name: 'asc'
      }
    })
    
    return data;
  } catch (err) {
    console.error('Database Error:', err);
    // throw new Error('Failed to fetch all customers.');
  }
}

// export async function fetchFilteredCustomers(query: string) {
//   try {
//     const data = await sql<CustomersTable>`
// 		SELECT
// 		  customers.id,
// 		  customers.name,
// 		  customers.email,
// 		  customers.image_url,
// 		  COUNT(invoices.id) AS total_invoices,
// 		  SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
// 		  SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
// 		FROM customers
// 		LEFT JOIN invoices ON customers.id = invoices.customer_id
// 		WHERE
// 		  customers.name ILIKE ${`%${query}%`} OR
//         customers.email ILIKE ${`%${query}%`}
// 		GROUP BY customers.id, customers.name, customers.email, customers.image_url
// 		ORDER BY customers.name ASC
// 	  `;

//     const customers = data.rows.map((customer) => ({
//       ...customer,
//       total_pending: formatCurrency(customer.total_pending),
//       total_paid: formatCurrency(customer.total_paid),
//     }));

//     return customers;
//   } catch (err) {
//     console.error('Database Error:', err);
//     throw new Error('Failed to fetch customer table.');
//   }
// }

// export async function getUser(email: string) {
//   try {
//     const user = await sql`SELECT * from USERS where email=${email}`;
//     return user.rows[0] as User;
//   } catch (error) {
//     console.error('Failed to fetch user:', error);
//     throw new Error('Failed to fetch user.');
//   }
// }
