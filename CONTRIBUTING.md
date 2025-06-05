# Contributing to Cinderlink

Thank you for your interest in contributing to Cinderlink! We welcome all contributions, including bug reports, feature requests, documentation improvements, and code contributions.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Testing](#testing)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Reporting Issues](#reporting-issues)
- [Feature Requests](#feature-requests)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
   ```bash
   git clone https://github.com/your-username/framework.git
   cd framework
   ```
3. **Set up the development environment**
   ```bash
   pnpm install
   pnpm build
   ```
4. **Create a branch** for your changes
   ```bash
   git checkout -b my-feature-branch
   ```

## Development Workflow

1. **Keep your fork in sync**
   ```bash
   git remote add upstream https://github.com/cinderlink/framework.git
   git fetch upstream
   git merge upstream/main
   ```

2. **Make your changes** following the code style guidelines

3. **Run tests** to ensure nothing is broken
   ```bash
   pnpm test
   ```

4. **Commit your changes** with a descriptive commit message
   ```bash
   git commit -m "feat: add new feature"
   ```

5. **Push to your fork**
   ```bash
   git push origin my-feature-branch
   ```

6. **Open a Pull Request** from your fork to the main repository

## Code Style

We use the following tools to maintain code quality:

- **TypeScript**: Strict typing is required
- **ESLint**: For code linting
- **Prettier**: For code formatting
- **Conventional Commits**: For commit messages

To format your code:
```bash
pnpm format
```

To check for linting errors:
```bash
pnpm lint
```

## Testing

We use Vitest for testing. Follow these guidelines:

1. Write tests for all new features and bug fixes
2. Tests should be placed in a `__tests__` directory next to the code being tested
3. Use descriptive test names
4. Mock external dependencies when appropriate

Run tests with:
```bash
# Run all tests
pnpm test

# Run tests for a specific package
cd packages/package-name
pnpm test

# Run tests in watch mode
pnpm test:watch
```

## Submitting a Pull Request

1. Ensure all tests pass
2. Update documentation if needed
3. Keep your PR focused on a single feature or fix
4. Reference any related issues in your PR description
5. Ensure your commit messages follow the [Conventional Commits](https://www.conventionalcommits.org/) format:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation changes
   - `style:` for formatting changes
   - `refactor:` for code changes that neither fix bugs nor add features
   - `test:` for adding or modifying tests
   - `chore:` for maintenance tasks

## Reporting Issues

When reporting issues, please include:

1. A clear, descriptive title
2. Steps to reproduce the issue
3. Expected vs. actual behavior
4. Any relevant error messages or logs
5. Version information (Node.js, npm/yarn, OS, etc.)

## Feature Requests

We welcome feature requests! Please:

1. Check if a similar feature request already exists
2. Clearly describe the feature and its benefits
3. Provide examples of how it would be used
4. Consider contributing a pull request if possible

## Documentation

Good documentation is crucial for any open-source project. We welcome improvements to:

- README files
- API documentation
- Tutorials and guides
- Code comments

## Community

Join our community to ask questions and discuss ideas:

- [Discord](https://discord.gg/your-invite-link)
- [GitHub Discussions](https://github.com/cinderlink/framework/discussions)
- [Twitter](https://twitter.com/cinderlink)

## License

By contributing to Cinderlink, you agree that your contributions will be licensed under the [MIT License](LICENSE).
