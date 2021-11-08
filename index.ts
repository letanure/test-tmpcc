interface TaskDict {
  [taskId: string]: {
    dependencies: string[]; // an array of task ids.
    task: (...dependencyResults: any[]) => any;
  }
}
interface TaskResultDict {
  [taskId: string]: (
    {
      status: 'resolved',
      value: any
    } |
    {
      status: 'failed',
      reason: any
    } |
    {
      status: 'skipped',
      unresolvedDependencies: string[]
    }
  );
}
export const runTasks = (tasks: TaskDict): Promise<TaskResultDict> => {
  // TODO
};