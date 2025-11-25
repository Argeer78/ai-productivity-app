export default async function TaskHistory() {
  const supabase = createServerSupabaseClient();
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_completed", true)
    .order("completed_at", { ascending: false });

  return (
    <main>
      <h1>Completed Tasks</h1>

      {tasks.length === 0 && <p>No completed tasks yet.</p>}

      <ul>
        {tasks.map(task => (
          <li key={task.id}>
            <strong>{task.title}</strong>
            <div>Completed: {formatDate(task.completed_at)}</div>
          </li>
        ))}
      </ul>
    </main>
  );
}
