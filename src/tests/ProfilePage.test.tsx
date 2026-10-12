import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { api } from '@/api/client';
import { TOKEN_STORAGE_KEY } from '@/api/endpoints';
import { makePngFile, renderAppAs } from './renderApp';

it('saves valid profile details only for the signed-in user', async () => {
  const user = userEvent.setup();
  renderAppAs('u-101', '/profile');
  await screen.findByRole('heading', { name: 'Profile' });
  await screen.findByDisplayValue('Thandi Mokoena');

  const nameField = screen.getByLabelText(/^Name/);
  await user.clear(nameField);
  expect(nameField).toHaveValue('');
  await user.type(nameField, 'Thandi Mokoena Updated');
  const emailField = screen.getByLabelText(/^Email/);
  await user.clear(emailField);
  expect(emailField).toHaveValue('');
  await user.type(emailField, 'thandi.updated@example.test');
  const phoneField = screen.getByLabelText(/^Phone/);
  await user.clear(phoneField);
  expect(phoneField).toHaveValue('');
  await user.type(phoneField, '+27 82 555 0101');
  await user.click(screen.getByRole('button', { name: 'Save details' }));

  expect(await screen.findByText('Your details were updated.')).toBeInTheDocument();
  const signedInUser = await api.session('mock.u-101.test');
  const otherUser = await api.session('mock.u-102.test');
  expect(signedInUser.user).toMatchObject({
    name: 'Thandi Mokoena Updated',
    email: 'thandi.updated@example.test',
    phone: '+27 82 555 0101',
  });
  expect(otherUser.user.name).toBe('Pieter van Wyk');
});

it('disables profile fields while a details save is pending', async () => {
  const user = userEvent.setup();
  renderAppAs('u-101', '/profile');
  await screen.findByRole('heading', { name: 'Profile' });
  await screen.findByDisplayValue('Thandi Mokoena');

  const nameField = screen.getByLabelText(/^Name/);
  await user.clear(nameField);
  await user.type(nameField, 'Thandi Saved Name');

  const completeSave = api.updateOwnDetails;
  let releaseSave!: () => void;
  const saveGate = new Promise<void>((resolve) => {
    releaseSave = resolve;
  });
  vi.spyOn(api, 'updateOwnDetails').mockImplementation(async (actorUserId, input) => {
    await saveGate;
    return completeSave(actorUserId, input);
  });

  const saveButton = screen.getByRole('button', { name: 'Save details' });
  await user.click(saveButton);
  try {
    expect(nameField).toBeDisabled();
    expect(saveButton).toBeDisabled();
    await user.type(nameField, ' typed while saving');
    expect(nameField).toHaveValue('Thandi Saved Name');
  } finally {
    releaseSave();
  }

  expect(await screen.findByText('Your details were updated.')).toBeInTheDocument();
  expect(nameField).toHaveValue('Thandi Saved Name');
});

it('shows red field errors and does not save invalid profile details', async () => {
  const user = userEvent.setup();
  renderAppAs('u-101', '/profile');
  await screen.findByRole('heading', { name: 'Profile' });
  await screen.findByDisplayValue('Thandi Mokoena');

  await user.clear(screen.getByLabelText(/^Name/));
  await user.type(screen.getByLabelText(/^Name/), 'x');
  await user.clear(screen.getByLabelText(/^Email/));
  await user.type(screen.getByLabelText(/^Email/), 'not-an-email');
  await user.clear(screen.getByLabelText(/^Phone/));
  await user.type(screen.getByLabelText(/^Phone/), 'call-me');
  await user.click(screen.getByRole('button', { name: 'Save details' }));

  const nameError = screen.getByText('Name needs at least 2 characters.');
  const emailError = screen.getByText('Enter a valid email address.');
  const phoneError = screen.getByText('Enter a valid phone number.');
  expect(nameError).toHaveClass('text-action-red');
  expect(emailError).toHaveClass('text-action-red');
  expect(phoneError).toHaveClass('text-action-red');
  expect(screen.getByLabelText(/^Name/)).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByLabelText(/^Email/)).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByLabelText(/^Phone/)).toHaveAttribute('aria-invalid', 'true');
});

it('shows errors for a weak or mismatched new password', async () => {
  const user = userEvent.setup();
  renderAppAs('u-101', '/profile');
  await screen.findByRole('heading', { name: 'Profile' });

  await user.type(screen.getByLabelText(/Current password/), 'current-value');
  await user.type(screen.getByLabelText(/New password/), 'short');
  await user.type(screen.getByLabelText(/Confirm new password/), 'short');
  await user.click(screen.getByRole('button', { name: 'Change password' }));
  expect(screen.getByText('Passwords are at least 8 characters.')).toBeInTheDocument();

  await user.clear(screen.getByLabelText(/New password/));
  await user.clear(screen.getByLabelText(/Confirm new password/));
  await user.type(screen.getByLabelText(/New password/), 'long-enough-password');
  await user.type(screen.getByLabelText(/Confirm new password/), 'different-password');
  await user.click(screen.getByRole('button', { name: 'Change password' }));
  expect(screen.getByText('The passwords do not match.')).toBeInTheDocument();
});

// Expected to fail with the mock API, which does not verify currentPassword; remove .fails once the real backend is connected.
it.fails('rejects an incorrect current password', async () => {
  const user = userEvent.setup();
  renderAppAs('u-101', '/profile');
  await screen.findByRole('heading', { name: 'Profile' });

  await user.type(screen.getByLabelText(/Current password/), 'incorrect-current-value');
  await user.type(screen.getByLabelText(/New password/), 'new-password-value');
  await user.type(screen.getByLabelText(/Confirm new password/), 'new-password-value');
  await user.click(screen.getByRole('button', { name: 'Change password' }));

  expect(await screen.findByRole('alert')).toBeInTheDocument();
});

it('clears successful password changes without storing or logging either password', async () => {
  const user = userEvent.setup();
  renderAppAs('u-101', '/profile');
  await screen.findByRole('heading', { name: 'Profile' });
  const currentPassword = 'current-value-that-is-not-stored';
  const newPassword = 'new-value-that-is-not-stored';

  await user.type(screen.getByLabelText(/Current password/), currentPassword);
  await user.type(screen.getByLabelText(/New password/), newPassword);
  await user.type(screen.getByLabelText(/Confirm new password/), newPassword);
  await user.click(screen.getByRole('button', { name: 'Change password' }));

  expect(await screen.findByText('Your password was changed.')).toBeInTheDocument();
  expect(screen.getByLabelText(/Current password/)).toHaveValue('');
  expect(screen.getByLabelText(/New password/)).toHaveValue('');
  expect(screen.getByLabelText(/Confirm new password/)).toHaveValue('');
  expect(window.localStorage.getItem(TOKEN_STORAGE_KEY)).not.toContain(currentPassword);
  const audit = await api.listAudit();
  expect(JSON.stringify(audit)).not.toContain(currentPassword);
  expect(JSON.stringify(audit)).not.toContain(newPassword);
});

it('rejects PDF and oversized profile pictures with clear messages', async () => {
  const user = userEvent.setup({ applyAccept: false });
  renderAppAs('u-101', '/profile');
  await screen.findByRole('heading', { name: 'Profile' });

  const input = screen.getByLabelText('Profile picture file');
  await user.upload(input, new File(['%PDF-1.7'], 'document.pdf', { type: 'application/pdf' }));
  expect(await screen.findByText('Use a JPG, PNG or WebP image.')).toBeInTheDocument();

  const oversized = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' });
  await user.upload(input, oversized);
  expect(await screen.findByText('That photo is larger than 5 MB. Choose a smaller one.')).toBeInTheDocument();
});

it('keeps the live profile picture while a valid replacement awaits approval', async () => {
  const user = userEvent.setup();
  renderAppAs('u-101', '/profile');
  await screen.findByRole('heading', { name: 'Profile' });
  const before = (await api.session('mock.u-101.test')).user.photo.live;

  await user.upload(screen.getByLabelText('Profile picture file'), makePngFile());
  await screen.findByAltText('Preview of your new profile picture');
  await user.click(screen.getByRole('button', { name: 'Submit for approval' }));

  expect(await screen.findByText('Your new profile picture is pending admin approval.')).toBeInTheDocument();
  expect(screen.getByAltText('New profile picture awaiting admin approval')).toBeInTheDocument();
  const after = (await api.session('mock.u-101.test')).user.photo;
  expect(after.status).toBe('pending');
  expect(after.pending).toBeTruthy();
  expect(after.live).toBe(before);
});

it('shows a rejection reason and lets the user submit another profile picture', async () => {
  const user = userEvent.setup();
  renderAppAs('u-103', '/profile');
  await screen.findByRole('heading', { name: 'Profile' });

  expect(screen.getByText('Please upload a clear, front-facing photo.')).toBeInTheDocument();
  const before = (await api.session('mock.u-103.test')).user.photo.live;
  await user.upload(screen.getByLabelText('Profile picture file'), makePngFile('replacement.png'));
  await screen.findByAltText('Preview of your new profile picture');
  await user.click(screen.getByRole('button', { name: 'Submit for approval' }));

  expect(await screen.findByAltText('New profile picture awaiting admin approval')).toBeInTheDocument();
  const after = (await api.session('mock.u-103.test')).user.photo;
  expect(after.status).toBe('pending');
  expect(after.live).toBe(before);
});

it('opens the signed-in user profile from the sidebar and shows only the live avatar', async () => {
  const user = userEvent.setup();
  renderAppAs('u-102', '/my-bikes/b-03');
  const profileLink = await screen.findByRole('link', { name: 'Open your profile, Pieter van Wyk' });
  const profile = (await api.session('mock.u-102.test')).user;

  expect(profileLink.querySelector('img')).toHaveAttribute('src', profile.photo.live);
  expect(profileLink.querySelector('img')).not.toHaveAttribute('src', profile.photo.pending);
  await user.click(profileLink);
  expect(await screen.findByRole('heading', { name: 'Profile' })).toBeInTheDocument();
  expect(screen.getByAltText('New profile picture awaiting admin approval')).toHaveAttribute('src', profile.photo.pending);
  const profileAvatars = Array.from(document.querySelectorAll('img[alt=""]')).map((image) => image.getAttribute('src'));
  expect(profileAvatars).toContain(profile.photo.live);
  expect(profileAvatars).not.toContain(profile.photo.pending);
});

it('shows only a persons live picture in the admin people list', async () => {
  renderAppAs('u-301', '/admin/people');
  await screen.findByRole('heading', { name: 'People' });
  const pieter = (await api.session('mock.u-102.test')).user;
  const row = await screen.findByRole('row', { name: /Pieter van Wyk/ });
  const avatar = row.querySelector('img');

  expect(avatar).toHaveAttribute('src', pieter.photo.live);
  expect(avatar).not.toHaveAttribute('src', pieter.photo.pending);
});