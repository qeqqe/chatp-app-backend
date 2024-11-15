"use client";

import { useEffect, useState } from "react";
import { FaTasks, FaCheckCircle, FaClock, FaChartBar } from "react-icons/fa";
import { useRouter } from "next/navigation";

interface Task {
  _id: string;
  title: string;
  status: string;
  priority: string;
  updatedAt: string;
}

const DashboardPage = () => {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    productivity: 0,
  });

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem("token");
      const userId = localStorage.getItem("userId");

      if (!token || !userId) {
        router.push("/");
        return;
      }

      const response = await fetch(
        `http://localhost:3001/getTasks?userId=${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          localStorage.clear(); // Clear all storage on auth error
          router.push("/");
          return;
        }
        throw new Error("Failed to fetch tasks");
      }

      const data = await response.json();
      if (data.userTasks) {
        setTasks(data.userTasks);

        const completed = data.userTasks.filter(
          (task: Task) => task.status === "completed"
        ).length;
        const total = data.userTasks.length;

        setStats({
          totalTasks: total,
          completedTasks: completed,
          pendingTasks: total - completed,
          productivity: total > 0 ? Math.round((completed / total) * 100) : 0,
        });
      }
    } catch (error) {
      console.error("Network error:", error);
      router.push("/");
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Task Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Total Tasks</p>
              <h2 className="text-2xl font-bold">{stats.totalTasks}</h2>
            </div>
            <FaTasks size="1.875rem" color="#3B82F6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Completed</p>
              <h2 className="text-2xl font-bold">{stats.completedTasks}</h2>
            </div>
            <FaCheckCircle size="1.875rem" color="#22C55E" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Pending</p>
              <h2 className="text-2xl font-bold">{stats.pendingTasks}</h2>
            </div>
            <FaClock size="1.875rem" color="#EAB308" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Productivity</p>
              <h2 className="text-2xl font-bold">{stats.productivity}%</h2>
            </div>
            <FaChartBar size="1.875rem" color="#A855F7" />
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Recent Tasks</h2>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="space-y-4">
            {tasks.slice(0, 5).map((task) => (
              <div
                key={task._id}
                className="flex items-center justify-between border-b pb-4"
              >
                <div>
                  <h3 className="font-semibold">{task.title}</h3>
                  <p className="text-gray-500 text-sm">
                    Updated: {new Date(task.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-sm ${
                      task.priority === "high"
                        ? "bg-red-100 text-red-800"
                        : task.priority === "medium"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {task.priority}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm ${
                      task.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : task.status === "in-progress"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {task.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
