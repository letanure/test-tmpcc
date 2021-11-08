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
  taskConfig: TaskConfig
): Promise<TaskResultDict> => {
  try {
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

export const runTasks = async (tasks: TaskDict): Promise<TaskResultDict> => {
  const taskResults = await Promise.all(
    Object.keys(tasks).map(async (taskId) => {
      return runTask(taskId, tasks[taskId])
    })
  )

  return taskResults.reduce((resultFinal, ResultItem) => {
    return {
      ...resultFinal,
      ...ResultItem
    }
  }, {})
}
