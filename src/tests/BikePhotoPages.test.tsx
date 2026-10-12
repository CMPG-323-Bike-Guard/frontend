import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { api } from '@/api/client';
import { makePngFile, renderAppAs } from './renderApp';

it('keeps the live bike picture while a replacement awaits approval', async () => {
  const user = userEvent.setup();
  renderAppAs('u-101', '/my-bikes/b-01');
  await screen.findByRole('heading', { name: 'Blue commuter' });
  const before = (await api.getBike('b-01')).bike.photo.live;

  await user.upload(screen.getByLabelText('New bike photo file'), makePngFile('new-bike.png'));
  await screen.findByAltText('Preview of a new photo for Blue commuter');
  await user.click(screen.getByRole('button', { name: 'Submit for approval' }));

  expect(await screen.findByAltText('New bike photo awaiting admin approval for Blue commuter')).toBeInTheDocument();
  const updatedBike = await api.getBike('b-01');
  expect(updatedBike.bike.photo.status).toBe('pending');
  expect(updatedBike.bike.photo.pending).toBeTruthy();
  expect(updatedBike.bike.photo.live).toBe(before);
});

it('submits a registered bike picture for admin approval', async () => {
  const user = userEvent.setup();
  renderAppAs('u-101', '/my-bikes/register');
  await screen.findByRole('heading', { name: 'Register a bike' });

  await user.type(screen.getByLabelText(/Name this bike/), 'Test campus bike');
  await user.type(screen.getByLabelText(/Make and model/), 'Example Road 1');
  await user.selectOptions(screen.getByLabelText(/Frame colour/), 'Blue');
  await user.upload(screen.getByLabelText(/Reference photo/), makePngFile('registration-bike.png'));
  await screen.findByAltText('Preview of the bike photo you selected');
  await user.click(screen.getByRole('button', { name: 'Submit for approval' }));

  expect(await screen.findByText('Bike photo pending approval')).toBeInTheDocument();
  const bikes = await api.listBikesForUser('u-101');
  const createdBike = bikes.find((view) => view.bike.name === 'Test campus bike');
  expect(createdBike?.bike.photo.status).toBe('pending');
  expect(createdBike?.bike.photo.pending).toBeTruthy();
  expect(createdBike?.bike.photo.live).toBeTruthy();
  expect(createdBike?.bike.photo.live).not.toBe(createdBike?.bike.photo.pending);
});