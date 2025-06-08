# Cinderlink Development Workflow

## Purpose
This document outlines the workflow and processes for tracking and managing development tasks in the Cinderlink project, specifically focusing on the IPFS/Helia integration updates.

## TRACKING.md Structure

### Overview
The `TRACKING.md` file is our central source of truth for tracking progress on major initiatives. It's organized into the following sections:

1. **Goals**: High-level objectives of the initiative
2. **Documentation References**: Links to relevant documentation
3. **Task Groups**: Grouped tasks with dependencies
4. **Status**: Current state and blockers
5. **Notes**: Additional context or important information

### Task Groups

#### Group Organization
- Tasks are organized into groups that can be worked on in parallel
- Each group contains 3-5 related tasks
- Groups must be completed in order (Group 1 → Group 2 → etc.)
- Tasks within a group can be worked on simultaneously

#### Task Format
Each task should include:
- [ ] A clear, action-oriented description
- Bullet points for subtasks or acceptance criteria
- The primary package it affects

### Status Section
- **Last Updated**: When the file was last modified
- **Current Focus**: Which group is currently being worked on
- **Blockers**: Any issues preventing progress

## Workflow Process

### Starting Work
1. Check `TRACKING.md` for the current focus group
2. Choose an unassigned task from the current group
3. Create a feature branch from `main` following the naming convention: `feat/groupX-task-description`

### During Development
1. Update the task in `TRACKING.md` with your name and start date
2. Reference the task number in your commit messages: `[Group X] Task description`
3. Keep commits atomic and focused on a single change

### Completing Tasks
1. Ensure all tests pass
2. Update documentation if needed
3. Mark the task as complete in `TRACKING.md`
4. Open a pull request with the `TRACKING.md` updates and your changes

### Moving Between Groups
1. All tasks in the current group must be completed before moving to the next
2. Update the **Status** section in `TRACKING.md` when moving to a new group
3. Hold a brief sync meeting when moving between groups to realign

## Best Practices

### Task Breakdown
- Keep tasks small and focused (1-3 days of work)
- Ensure tasks are independent within groups
- Document any assumptions or decisions in the task description

### Communication
- Update `TRACKING.md` at least daily when actively working on a task
- Use the #development channel in Slack for task-related discussions
- Tag relevant team members when their input is needed

### Review Process
- All changes must be reviewed by at least one other team member
- Link PRs to the corresponding task in `TRACKING.md`
- Update documentation as part of the task, not as an afterthought

## Maintenance
- The Technical Lead is responsible for keeping `TRACKING.md` up to date
- Review and refine the tracking process during retrospectives
- Update this workflow document as the process evolves
