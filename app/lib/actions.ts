'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// you'd want to validate
const InvoiceSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  amount: z.coerce.number(),
  status: z.enum(['pending', 'paid']),
  date: z.string(),
});
 
const CreateInvoice = InvoiceSchema.omit({ id: true, date: true });

export async function createInvoice(formData: FormData) {
  const rawFormData = Object.fromEntries(formData.entries());
  const { customerId, amount, status } = CreateInvoice.parse(rawFormData)
  
  const amountInCents = amount * 100;
  const date = new Date().toISOString();

  await prisma.invoices.create({
    data: {
      customer_id: customerId,
      amount: amountInCents,
      status: status,
      date: date
    },
  });
  // Test it out:
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}