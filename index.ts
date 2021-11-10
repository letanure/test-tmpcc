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
  idTask: string,
  task: TaskConfig,
  queueResults: TaskResultDict
) => {
  try {
    let resultsDepsValues: TaskResultDict[] = []
    if (task.dependencies.length > 0) {
      const resultsDeps = task.dependencies.map((id) => ({
        id,
        ...queueResults[id]
      }))
      if (!queueResults[task.dependencies[0]]) {
        return {
          status: 'skipped',
          unresolvedDependencies: task.dependencies
        }
      }
      const unresolvedDependencies = resultsDeps
        .filter(
          (result) =>
            result.status === 'failed' ||
            result.status === 'skipped' ||
            result.id === idTask
        )
        .map(({ id }) => id)
      if (unresolvedDependencies.length > 0) {
        return {
          status: 'skipped',
          unresolvedDependencies
        }
      } else {
        resultsDepsValues = resultsDeps.map(({ value }) => value)
      }
    }
    const value3 = await task.task(...resultsDepsValues)
    return {
      status: 'resolved',
      value: value3
    }
  } catch (error) {
    return {
      status: 'failed',
      reason: error
    }
  }
}

function orderTasks(tasks: TaskDict) {
  let result: string[] = []
  Object.entries(tasks).forEach((taskConfig) => {
    const [id, task] = taskConfig
    let dependencies = task.dependencies
    result.unshift(id)
    while (dependencies.length > 0) {
      result.unshift(...dependencies)
      if (dependencies.includes(id)) {
        dependencies = []
      } else {
        dependencies = tasks[dependencies[0]].dependencies
      }
    }
  })
  return [...new Set(result.flat())]
}

export const runTasks = async (tasks: TaskDict): Promise<TaskResultDict> => {
  let results: TaskResultDict = {}

  const taskResults = await Promise.all(
    Object.entries(tasks)
      .filter((item) => item[1].dependencies.length === 0)
      .map((item) => item[0])
      .map(async (taskId) => ({
        id: taskId,
        task: await runTask(taskId, tasks[taskId], results)
      }))
  )

  results = taskResults.reduce((resultFinal, item) => {
    return {
      ...resultFinal,
      [item.id]: item.task
    }
  }, {})

  const tasksQueue = [...orderTasks(tasks)]

  for (const [i, id] of tasksQueue.entries()) {
    const task = tasks[id]
    if (!results[id]) results[id] = await runTask(id, task, results)
  }

  return results
}
