# To learn more about how to use Nix to configure your environment
# see: https://firebase.google.com/docs/customize-workspace
#
# AI AGENT NOTE: Before doing any work in this workspace (Project IDX or
# otherwise), read AGENTS.md first. It is the canonical operating manual
# for any AI agent/model on Speed4You. Every tool-specific entry file
# (CLAUDE.md, .cursorrules, .github/copilot-instructions.md, etc.) is a
# thin pointer back to AGENTS.md. Update AGENTS.md and every tool follows.
{ pkgs, ... }: {
  # Which nixpkgs channel to use.
  channel = "stable-24.05"; # or "unstable"

  # Use https://search.nixos.org/packages to find packages
  packages = [
    # pkgs.go
    # pkgs.python311
    # pkgs.python311Packages.pip
    pkgs.nodejs_20
    pkgs.ffmpeg
  ];

  # Sets environment variables in the workspace
  env = {
    # Tell every AI agent in this workspace to read AGENTS.md first.
    # Most agent CLIs (opencode, Aider, Claude Code) read AGENTS.md
    # automatically. This is just a safety net for the few that don't.
    AGENTS_MD = "AGENTS.md";
  };
  idx = {
    # Search for the extensions you want on https://open-vsx.org/ and use "publisher.id"
    extensions = [
      # "vscodevim.vim"
    ];

    # Enable previews
    previews = {
      enable = true;
      previews = {
        # web = {
        #   # Example: run "npm run dev" with PORT set to IDX's defined port for previews,
        #   # and show it in IDX's web preview panel
        #   command = ["npm" "run" "dev"];
        #   manager = "web";
        #   env = {
        #     # Environment variables to set for your server
        #     PORT = "$PORT";
        #   };
        # };
      };
    };

    # Workspace lifecycle hooks
    workspace = {
      # Runs when a workspace is first created
      onCreate = {
        # Example: install JS dependencies from NPM
        # npm-install = "npm install";
      };
      # Runs when a workspace is (re)started
      onStart = {
        # Example: start a background task to watch and re-build backend code
        # watch-backend = "npm run watch-backend";
      };
    };
  };
}
