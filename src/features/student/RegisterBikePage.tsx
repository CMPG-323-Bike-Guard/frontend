import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { useCurrentUser } from '@/auth/AuthContext';
import { useCreateBike } from '@/api/queries';
import { ApiError } from '@/api/client';
import { useToast } from '@/components/ui/Toast';
import { Alert } from '@/components/ui/Alert';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button, LinkButton } from '@/components/ui/Button';
import { BikeForm, type BikeFormValues } from '@/components/domain/BikeForm';

/**
 * UC-01, Register Bicycle.
 *
 * The student captures the details; an administrator then reviews them and
 * allocates a tag. The tag is therefore never entered here - the student
 * collects a pre-programmed tag afterwards.
 */
export function RegisterBikePage() {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const toast = useToast();
  const createBike = useCreateBike();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ name: string } | null>(null);

  async function save(values: BikeFormValues, submit: boolean) {
    setError(null);
    try {
      await createBike.mutateAsync({ ownerUserId: user.userId, input: values, submit, actorUserId: user.userId });
      if (submit) {
        setDone({ name: values.name });
      } else {
        toast.confirm('Draft saved. Finish it whenever you are ready.');
        navigate('/my-bikes');
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'The registration could not be saved.');
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardBody className="flex flex-col items-start gap-4 py-8">
            <CheckCircle2 className="h-10 w-10 text-ok-500" aria-hidden="true" />
            <div>
              <h1 className="text-2xl font-semibold">“{done.name}” is with Protection Services</h1>
              <p className="prose-measure mt-2 text-ink-600">
                An administrator checks the details and programmes a tag for the frame. You will get a message here when
                the tag is ready to collect, and the gate will start recognising the bike once the tag is fitted.
              </p>
            </div>
            <div className="flex gap-2">
              <LinkButton to="/my-bikes">Back to my bikes</LinkButton>
              <Button variant="secondary" onClick={() => setDone(null)}>
                Register another bike
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader
        title="Register a bike"
        description="Pair a bike with your student card so the gate can tell that the two belong together."
      />

      <Alert tone="info" title="What happens next">
        Protection Services checks these details, programmes an RFID tag and tells you when to collect it. You fit the
        tag to the frame yourself — it takes a minute and needs no tools.
      </Alert>

      <Card>
        <CardHeader title="Bike details" description="All four fields are used by guards to identify the bike at a gate." />
        <CardBody>
          {error && <Alert tone="alert" className="mb-4">{error}</Alert>}
          <BikeForm
            submitLabel="Submit for approval"
            secondaryLabel="Save as draft"
            submitting={createBike.isPending}
            onSubmit={(values) => save(values, true)}
            onSecondary={(values) => save(values, false)}
            onCancel={() => navigate('/my-bikes')}
          />
        </CardBody>
      </Card>
    </div>
  );
}
