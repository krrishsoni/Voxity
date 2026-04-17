import { redirect } from "next/navigation";
import { CreatePollForm } from "@/components/polls/create-poll-form";
import { createClient } from "@/lib/supabase/server";

export default async function CreatePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <CreatePollForm />;
}
