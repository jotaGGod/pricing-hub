import { AuthLayout } from "../../components/AuthLayout";
import { RegisterForm } from "../../components/RegisterForm";

export function RegisterPage() {
  return (
    <AuthLayout>
      <RegisterForm />
    </AuthLayout>
  );
}
