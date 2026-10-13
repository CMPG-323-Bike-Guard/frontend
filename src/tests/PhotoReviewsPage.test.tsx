import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { api } from '@/api/client';
import { renderAppAs } from './renderApp';

it('makes an approved profile picture live and removes it from the review list', async () => {
  const user = userEvent.setup();
  renderAppAs('u-301', '/admin/photo-reviews');
  await screen.findByRole('heading', { name: 'Photo reviews' });

  const submittedPhoto = await screen.findByAltText('Submitted profile picture from Pieter van Wyk');
  const submittedUrl = submittedPhoto.getAttribute('src');
  const reviewItem = submittedPhoto.closest('li');
  expect(reviewItem).not.toBeNull();
  await user.click(within(reviewItem as HTMLElement).getByRole('button', { name: 'Approve' }));

  await waitFor(() => expect(screen.queryByAltText('Submitted profile picture from Pieter van Wyk')).not.toBeInTheDocument());
  const reviewedUser = (await api.session('mock.u-102.test')).user;
  expect(reviewedUser.photo.status).toBe('approved');
  expect(reviewedUser.photo.live).toBe(submittedUrl);
  expect(reviewedUser.photo.pending).toBeNull();
});

it('requires a rejection reason and keeps the previous live profile picture', async () => {
  const user = userEvent.setup();
  renderAppAs('u-301', '/admin/photo-reviews');
  await screen.findByRole('heading', { name: 'Photo reviews' });

  const submittedPhoto = await screen.findByAltText('Submitted profile picture from Pieter van Wyk');
  const reviewItem = submittedPhoto.closest('li');
  const before = (await api.session('mock.u-102.test')).user.photo.live;
  expect(reviewItem).not.toBeNull();
  await user.click(within(reviewItem as HTMLElement).getByRole('button', { name: 'Reject' }));
  await user.click(screen.getByRole('button', { name: 'Reject photo' }));
  expect(screen.getByText('Enter a reason for rejecting this photo.')).toBeInTheDocument();

  const reason = 'Please upload a clear, front-facing photo.';
  await user.type(screen.getByLabelText(/Reason/), reason);
  await user.click(screen.getByRole('button', { name: 'Reject photo' }));

  expect(await screen.findByText('Photo rejected. The user has been notified.')).toBeInTheDocument();
  const reviewedUser = (await api.session('mock.u-102.test')).user;
  expect(reviewedUser.photo.status).toBe('rejected');
  expect(reviewedUser.photo.rejectionReason).toBe(reason);
  expect(reviewedUser.photo.live).toBe(before);
});

it('refuses photo approvals and rejections from a student', async () => {
  renderAppAs('u-101', '/admin/photo-reviews');
  expect(await screen.findByText('This area is outside your role')).toBeInTheDocument();

  await expect(api.approvePhoto('user', 'u-102', 'u-101')).rejects.toMatchObject({ code: 'forbidden' });
  await expect(api.rejectPhoto('user', 'u-102', 'Not acceptable', 'u-101')).rejects.toMatchObject({
    code: 'forbidden',
  });
});