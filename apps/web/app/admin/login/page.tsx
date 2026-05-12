'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@repo/shared';
import { z } from 'zod';
import { apiFetch } from '../../../lib/api';
import { useI18n } from '../../../components/providers';

type LoginInput = z.infer<typeof loginSchema>;

export default function AdminLoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' }
  });

  const mutation = useMutation({
    mutationFn: (input: LoginInput) =>
      apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(input)
      }),
    onSuccess: () => router.push('/admin')
  });

  return (
    <main className="mx-auto mt-16 max-w-md rounded bg-[#f4f4f4] p-6 text-[#4a4947] shadow">
      <h1 className="mb-4 text-2xl font-bold">{t('admin.loginTitle')}</h1>
      <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <input className="w-full rounded border border-[#b17457]/40 bg-white p-2" placeholder={t('admin.username')} {...form.register('username')} />
        <input className="w-full rounded border border-[#b17457]/40 bg-white p-2" placeholder={t('admin.password')} type="password" {...form.register('password')} />
        <button className="w-full rounded bg-[#b17457] px-4 py-2 text-white disabled:opacity-50" disabled={mutation.isPending}>
          {mutation.isPending ? t('admin.signingIn') : t('admin.signIn')}
        </button>
      </form>
      {mutation.isError && <p className="mt-3 text-red-600">{t('admin.loginFailed')}</p>}
    </main>
  );
}
