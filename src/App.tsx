import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { Dashboard } from './pages/Dashboard'

// Environments group
import { EnvironmentList }   from './pages/environments/EnvironmentList'
import { BuildList }          from './pages/environments/BuildList'
import { PackageList }        from './pages/environments/PackageList'
import { ServiceUnitList }    from './pages/environments/ServiceUnitList'
import { DeploymentList }     from './pages/environments/DeploymentList'

// Dependencies
// import { DependenciesList } from "./pages/dependencies/DependenciesList"

// Sources
import { GitRepositoryList }  from './pages/sources/GitRepositoryList'

// Events
import { GitHubEventList }    from './pages/events/GitHubEventList'

// Networking
import { RouteList }          from './pages/networking/RouteList'
import { DomainList }         from './pages/networking/DomainList'

// Supply chain
// import { SupplyChainList }    from './pages/supplychain/SupplyChainList'
// import { GitHubWebhookList }  from './pages/supplychain/GitHubWebhookList'

// Logs
import { LogsPage }           from './pages/logs/LogsPage'
import { LogsListPage }       from './pages/logs/LogsListPage'

// CLI
import { CLIPage }            from './pages/CLIPage'

// Create forms — existing
import { EnvironmentForm }    from './forms/EnvironmentForm'
import { BuildForm }          from './forms/BuildForm'
import { PackageForm }        from './forms/PackageForm'
import { ServiceUnitForm }    from './forms/ServiceUnitForm'
import { DeploymentForm }     from './forms/DeploymentForm'
import { GitRepositoryForm }  from './forms/GitRepositoryForm'
import { GitHubEventForm }    from './forms/GitHubEventForm'
import { RouteForm }          from './forms/RouteForm'
import { DomainForm }         from './forms/DomainForm'

// Create forms — new
// import { SupplyChainForm }    from './forms/SupplyChainForm'
// import { GitHubWebhookForm }  from './forms/GitHubWebhookForm'

// Patch forms
import { BuildPatch }         from './forms/BuildPatch'

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/"          element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Environments */}
          <Route path="/environments"       element={<EnvironmentList />} />
          <Route path="/environments/new"   element={<EnvironmentForm />} />
          <Route path="/builds"             element={<BuildList />} />
          <Route path="/builds/new"         element={<BuildForm />} />
          <Route path="/builds/:namespace/:name/patch" element={<BuildPatch />} />
          <Route path="/packages"           element={<PackageList />} />
          <Route path="/packages/new"       element={<PackageForm />} />
          <Route path="/serviceunits"       element={<ServiceUnitList />} />
          <Route path="/serviceunits/new"   element={<ServiceUnitForm />} />
          <Route path="/deployments"        element={<DeploymentList />} />
          <Route path="/deployments/new"    element={<DeploymentForm />} />

          {/* Networking */}
          <Route path="/routes"             element={<RouteList />} />
          <Route path="/routes/new"         element={<RouteForm />} />
          <Route path="/domains"            element={<DomainList />} />
          <Route path="/domains/new"        element={<DomainForm />} />

          {/* Dependencies */}
          {/* <Route path="/dependencies"         element={<DependenciesList />} />
          <Route path="/dependencies/:name"   element={<DependenciesList />} /> */}

          {/* Sources */}
          <Route path="/gitrepositories"      element={<GitRepositoryList />} />
          <Route path="/gitrepositories/new"  element={<GitRepositoryForm />} />

          {/* Events */}
          <Route path="/githubevents"         element={<GitHubEventList />} />
          <Route path="/githubevents/new"     element={<GitHubEventForm />} />
          {/* Supply chain */}
          {/* <Route path="/supplychains"         element={<SupplyChainList />} />
          <Route path="/supplychains/new"     element={<SupplyChainForm />} />
          <Route path="/githubwebhooks"       element={<GitHubWebhookList />} />
          <Route path="/githubwebhooks/new"   element={<GitHubWebhookForm />} /> */}

          {/* Logs */}
          <Route path="/logs"             element={<LogsListPage />} />
          <Route path="/logs/:namespace/:pod" element={<LogsPage />} />

          {/* CLI */}
          <Route path="/cli" element={<CLIPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
