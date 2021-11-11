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
      if (!queueResults[task.dependencies[0]]) {
        return {
          status: 'skipped',
          unresolvedDependencies: task.dependencies
        }
      }
      const resultsDeps = task.dependencies.map((id) => ({
        id,
        ...queueResults[id]
      }))
      const unresolvedDependencies = resultsDeps
        .filter(
          (result) => result.status === 'failed' || result.status === 'skipped'
        )
        .map(({ id }) => id)
      if (unresolvedDependencies.length <= 0) {
        resultsDepsValues = resultsDeps.map(({ value }) => value)
      } else {
        return {
          status: 'skipped',
          unresolvedDependencies
        }
      }
    }
    return {
      status: 'resolved',
      value: await task.task(...resultsDepsValues)
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

  const tasksWithoutDepsResults = await Promise.all(
    Object.entries(tasks)
      // filter tasks without dependencies
      .filter((item) => item[1].dependencies.length === 0)
      // return only the ID
      .map((item) => item[0])
      // resolve the task
      .map(async (id) => ({
        id,
        task: await runTask(id, tasks[id], results)
      }))
  )

  // change the format from array of resolved promises to the return format
  results = tasksWithoutDepsResults.reduce((resultFinal, item) => {
    return {
      ...resultFinal,
      [item.id]: item.task
    }
  }, {})

  // order all tasks
  const tasksQueue = [...orderTasks(tasks)]

  // resolve all tasks, checking if is alread resolved
  for (const [i, id] of tasksQueue.entries()) {
    const task = tasks[id]
    if (!results[id]) {
      results[id] = await runTask(id, task, results)
    }
  }

  return results
}
