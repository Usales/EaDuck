loadDashboardData() {
    const user = this.authService.getCurrentUser();
    
    // Só busca usuários se for admin
    if (user?.role === 'ADMIN') {
      this.userService.getAllUsers().subscribe((users: any[]) => {
        this.totalUsers = users.length;
        this.usersByRole = users.reduce((acc, u) => {
          acc[u.role] = (acc[u.role] || 0) + 1;
          return acc;
        }, {} as { [role: string]: number });
      });
    }

    // Busca salas (todos podem ver)
    this.http.get<{ [key: string]: number }>('http://localhost:8080/api/dashboard/tasks-by-classroom').subscribe((data) => {
      const labels = Object.keys(data);
      const series = Object.values(data);
      this.classroomsChart = {
        ...this.classroomsChart,
        labels: labels as any,
        series: [{ name: 'Tarefas', data: series }] as any
      };
    });

    // Busca notificações (todos podem ver, mas o backend filtra)
    this.http.get<any[]>('http://localhost:8080/api/notifications').subscribe((notifications: any[]) => {
      this.totalNotifications = notifications.length;
      // Tipos de notificações
      const types = ['AVISO', 'TAREFA', 'SISTEMA', 'FÓRUM'];
      const counts = types.map(type => notifications.filter((n: any) => (n.notificationType || '').toUpperCase() === type).length);
      this.notificationsChart.series = counts;
    });

    // Busca tarefas (todos podem ver, mas o backend filtra)
    this.http.get<any[]>('http://localhost:8080/api/tasks').subscribe((tasks: any[]) => {
      this.totalTasks = tasks.length;
      // Tarefas feitas x para fazer
      const feitas = tasks.filter((t: any) => t.status === 'CONCLUIDA' || t.status === 'CONCLUIDO').length;
      const paraFazer = tasks.length - feitas;
      this.tasksChart.series = [feitas, paraFazer];
    });
  } 