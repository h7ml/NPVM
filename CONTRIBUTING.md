# Contributing to NPVM

Thank you for your interest in contributing to NPVM! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Git

### Development Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/NPVM.git
   cd NPVM
   ```
3. Install dependencies:
   ```bash
   pnpm install
   ```
4. Create a branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
5. Start development:
   ```bash
   pnpm dev
   ```

## Project Structure

```
NPVM/
├── packages/
│   ├── shared/     # Shared types and utilities
│   ├── server/     # Fastify backend
│   └── web/        # React frontend
├── .github/        # GitHub workflows and templates
└── docs/           # Documentation
```

## Development Workflow

### Code Style

- Use TypeScript for all code
- Follow existing code patterns
- Use meaningful variable and function names
- Keep functions small and focused

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add package search feature
fix: resolve dependency tree display issue
docs: update API documentation
chore: upgrade dependencies
```

### Before Submitting

1. Run type check:
   ```bash
   pnpm typecheck
   ```

2. Run build:
   ```bash
   pnpm build
   ```

3. Test your changes manually

## Pull Request Process

1. Update documentation if needed
2. Ensure all checks pass
3. Request review from maintainers
4. Squash commits before merging

## Reporting Issues

When reporting issues, please include:

- Node.js and pnpm versions
- Operating system
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable

## Feature Requests

We welcome feature requests! Please open an issue with:

- Clear description of the feature
- Use case / motivation
- Proposed implementation (optional)

## Questions?

Feel free to open an issue for questions or reach out to the maintainers.

---

Thank you for contributing! 🎉
