const buttons = document.querySelectorAll('.filters button');
const projects = document.querySelectorAll('.project');

buttons.forEach((button) => {
  button.addEventListener('click', () => {
    buttons.forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    const filter = button.dataset.filter;
    projects.forEach((project) => {
      const show = filter === 'all' || project.dataset.category === filter;
      project.hidden = !show;
    });
  });
});
