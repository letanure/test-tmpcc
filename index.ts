type TaskConfig = {
  dependencies: string[] // an array of task ids.
  task: (...dependencyResults: any[]) => any
}

interface TaskDict {
  [taskId: string]: TaskConfig
}
interface TaskResultDict {
  [taskId: string]:
    | {
        status: 'resolved'
        value: any
      }
    | {
        status: 'failed'
        reason: any
      }
    | {
        status: 'skipped'
        unresolvedDependencies: string[]
      }
}

const runTask = async (
  taskId: string,
  taskConfig: TaskConfig,
  tasks: TaskDict
): Promise<TaskResultDict> => {
  try {
    if (taskConfig?.dependencies.length > 0) {
      const taskResults = await runTasksByIds(taskConfig.dependencies, tasks)
      const failedTasks = taskResults
        .map((taskResult) => {
          return Object.keys(taskResult)
            .map((key) => {
              return taskResult[key].status === 'failed' ? key : null
            })
            .filter((key) => key !== null)
        })
        .flat()
      if (failedTasks.length > 0) {
        return {
          [taskId]: {
            status: 'skipped',
            unresolvedDependencies: failedTasks
          }
        }
      }
    }
    const value = await taskConfig.task()
    return {
      [taskId]: {
        status: 'resolved',
        value
      }
    }
  } catch (error) {
    return {
      [taskId]: {
        status: 'failed',
        reason: error
      }
    }
  }
}

const runTasksByIds = async (tasKeys: string[], tasks: TaskDict) => {
  return await Promise.all(
    tasKeys.map(async (taskId) => {
      return runTask(taskId, tasks[taskId], tasks)
    })
  )
}

export const runTasks = async (tasks: TaskDict): Promise<TaskResultDict> => {
  const taskResults = await runTasksByIds(Object.keys(tasks), tasks)

  return taskResults.reduce((resultFinal, ResultItem) => {
    return {
      ...resultFinal,
      ...ResultItem
    }
  }, {})
}
