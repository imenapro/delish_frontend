import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, EyeOff } from "lucide-react";

// Schema for validation
const staffSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  role: z.string().min(1, "Role is required"),
  shopId: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
});

export type StaffFormValues = z.infer<typeof staffSchema>;

interface StaffFormProps {
  initialData?: StaffFormValues & { id?: string };
  onSubmit: (data: StaffFormValues) => void;
  isEditing?: boolean;
  isLoading?: boolean;
  shops?: { id: string; name: string }[];
  manageableRoles?: string[];
}

export function StaffForm({
  initialData,
  onSubmit,
  isEditing = false,
  isLoading = false,
  shops,
  manageableRoles,
}: StaffFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      name: initialData?.name || "",
      email: initialData?.email || "",
      phone: initialData?.phone || "",
      role: initialData?.role || "",
      shopId: initialData?.shopId || "none",
      password: "",
    },
  });

  // Reset form when initialData changes
  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        email: initialData.email,
        phone: initialData.phone,
        role: initialData.role,
        shopId: initialData.shopId || "none",
      });
    }
  }, [initialData, form]);

  const generatePassword = () => {
    const length = 12;
    const charset =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setGeneratedPassword(password);
    form.setValue("password", password);
  };

  const handleSubmit = (data: StaffFormValues) => {
    if (!isEditing && !data.password) {
      form.setError("password", { message: "Password is required for new staff" });
      return;
    }
    onSubmit(data);
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="name">Full Name *</Label>
        <Input
          id="name"
          placeholder="John Doe"
          {...form.register("name")}
        />
        {form.formState.errors.name && (
          <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          placeholder="john@example.com"
          {...form.register("email")}
          disabled={isEditing} // Email is usually immutable or hard to change
        />
        {form.formState.errors.email && (
          <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone *</Label>
        <Input
          id="phone"
          placeholder="+250 xxx xxx xxx"
          {...form.register("phone")}
        />
        {form.formState.errors.phone && (
          <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Role *</Label>
        <Select
          onValueChange={(value) => form.setValue("role", value)}
          defaultValue={form.getValues("role")}
          value={form.watch("role")}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            {manageableRoles?.map((role) => (
              <SelectItem key={role} value={role}>
                {role.replace("_", " ").toUpperCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.role && (
          <p className="text-sm text-destructive">{form.formState.errors.role.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="shop">Assign to Shop (Optional)</Label>
        <Select
          onValueChange={(value) => form.setValue("shopId", value)}
          defaultValue={form.getValues("shopId")}
          value={form.watch("shopId")}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a shop" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No shop assignment</SelectItem>
            {shops?.map((shop) => (
              <SelectItem key={shop.id} value={shop.id}>
                {shop.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!isEditing && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Initial Password *</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={generatePassword}
            >
              Generate
            </Button>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter or generate password"
              {...form.register("password")}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
          {generatedPassword && (
            <p className="text-sm text-muted-foreground">
              Save this password securely: <strong>{generatedPassword}</strong>
            </p>
          )}
          {form.formState.errors.password && (
            <p className="text-sm text-destructive">
              {form.formState.errors.password.message}
            </p>
          )}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading
          ? isEditing
            ? "Updating..."
            : "Creating..."
          : isEditing
          ? "Update Staff Member"
          : "Create Staff Member"}
      </Button>
    </form>
  );
}
