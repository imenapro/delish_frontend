# Delish Frontend

This is the frontend repository for the Delish project.

## Development Setup

1.  Clone the repository.
2.  Install dependencies: `npm install`.
3.  Start the development server: `npm run dev`.

## Deployment

The project is configured for deployment on DigitalOcean App Platform with separate environments for Development and Production.

### Environments

*   **Production**: Deploys from the `main` branch.
*   **Development**: Deploys from the `development` branch.

### GitHub Actions

We use GitHub Actions for CI/CD. The workflows are defined in `.github/workflows/`:

*   `production.yml`: Builds and deploys to the Production environment on push to `main`.
*   `development.yml`: Builds and deploys to the Development environment on push to or PR against `development`.

### Setting up DigitalOcean Deployment

1.  **Create Apps in DigitalOcean**:
    *   Create two apps in DigitalOcean App Platform: one for production (e.g., `delish-frontend-prod`) and one for development (e.g., `delish-frontend-dev`).
    *   Connect them to this GitHub repository.

2.  **Configure Secrets**:
    *   Get a DigitalOcean Personal Access Token (PAT).
    *   Add it to your GitHub Repository Secrets as `DIGITALOCEAN_ACCESS_TOKEN`.

3.  **Automatic Deployment**:
    *   The GitHub Actions are configured to trigger deployments using the `digitalocean/app_action`.
    *   Alternatively, you can enable "Autodeploy" in the DigitalOcean App Platform settings for the respective branches.

### Workflow

1.  Create a feature branch from `development`.
2.  Make changes and push to the feature branch.
3.  Open a Pull Request (PR) to merge into `development`.
4.  Once approved and merged, the changes will be deployed to the Development environment.
5.  After verification, create a PR to merge `development` into `main` for Production deployment.
