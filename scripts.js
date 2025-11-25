document.querySelectorAll('.project-card').forEach(card => {
    let projectUrl = card.getAttribute('data-url');
    
    // Handle hover to show live preview
    card.addEventListener('mouseenter', function() {
        let preview = this.querySelector('.hover-preview iframe');
        preview.src = projectUrl; // Load live preview
    });

    card.addEventListener('mouseleave', function() {
        let preview = this.querySelector('.hover-preview iframe');
        preview.src = ""; // Stop loading when not hovered
    });

    // Ensure clicking anywhere on the card opens the project
    card.addEventListener('click', function(event) {
        // Prevent iframe interactions from stopping the click event
        if (!event.target.closest(".hover-preview")) {
            window.open(projectUrl, '_blank'); // Open in new tab
        }
    });
});


document.getElementById("showMoreBtn").addEventListener("click", function() {
    let moreProjects = document.querySelector(".more-projects");
    
    if (moreProjects.classList.contains("d-none")) {
        moreProjects.classList.remove("d-none");
        this.textContent = "Show Less";
    } else {
        moreProjects.classList.add("d-none");
        this.textContent = "Show More";
    }
});
console.log('shown')



  document.addEventListener("DOMContentLoaded", function () {
    const iframes = document.querySelectorAll("iframe[src*='vimeo.com']");
    const players = [];

    // Load Vimeo Player API
    iframes.forEach((iframe) => {
      const player = new Vimeo.Player(iframe);
      players.push(player);

      player.on("play", () => {
        players.forEach((p) => {
          if (p !== player) {
            p.pause();
          }
        });
      });
    });
  });

