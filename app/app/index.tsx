import { Redirect } from "expo-router";

// "/" opens the Today tab. The root layout's guards send signed-out people to onboarding before this runs.
export default function Index() {
  return <Redirect href="/today" />;
}
