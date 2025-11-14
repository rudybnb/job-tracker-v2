import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import Jobs from "./pages/Jobs";
import JobDetail from "./pages/JobDetail";
import CsvUpload from "./pages/CsvUpload";
import Contractors from "./pages/Contractors";
import BudgetTracking from "./pages/BudgetTracking";
import WorkSessions from "./pages/WorkSessions";
import JobAssignments from "./pages/JobAssignments";

function Router() {
  return (
    <Switch>
      {/* Dashboard routes */}
      <Route path={"/"}>
        <DashboardLayout>
          <Home />
        </DashboardLayout>
      </Route>
      
      {/* Dashboard routes */}
      <Route path={"/dashboard"}>
        <DashboardLayout>
          <Home />
        </DashboardLayout>
      </Route>
      
      <Route path={"/jobs"}>
        <DashboardLayout>
          <Jobs />
        </DashboardLayout>
      </Route>
      
      <Route path={"/jobs/:id"}>
        {(params) => (
          <DashboardLayout>
            <JobDetail jobId={parseInt(params.id)} />
          </DashboardLayout>
        )}
      </Route>
      
      <Route path={"/upload"}>
        <DashboardLayout>
          <CsvUpload />
        </DashboardLayout>
      </Route>
      
      <Route path={"/contractors"}>
        <DashboardLayout>
          <Contractors />
        </DashboardLayout>
      </Route>
      
      <Route path={"/assignments"}>
        <DashboardLayout>
          <JobAssignments />
        </DashboardLayout>
      </Route>
      
      <Route path={"/budgets"}>
        <DashboardLayout>
          <BudgetTracking />
        </DashboardLayout>
      </Route>
      
      <Route path={"/sessions"}>
        <DashboardLayout>
          <WorkSessions />
        </DashboardLayout>
      </Route>
      
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
