import Array "mo:core/Array";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";

actor {
  type PlotIndex = Nat;

  type Plant = {
    seedType : Text;
    growthStage : Nat;
    waterCount : Nat;
  };

  type GardenStats = {
    totalBlooms : Nat;
    totalWaters : Nat;
  };

  type Garden = {
    plots : [?Plant];
    stats : GardenStats;
  };

  public type UserProfile = {
    name : Text;
  };

  let gridSize : Nat = 12; // 3x4 grid

  // Authorization
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  let _gardens = Map.empty<Principal, Garden>();
  let userProfiles = Map.empty<Principal, UserProfile>();

  // User Profile Management (required by instructions)
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Garden Operations
  public query ({ caller }) func getGarden() : async Garden {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view gardens");
    };
    getGardenOrDefault(caller);
  };

  public shared ({ caller }) func plantSeed(plotIndex : Nat, seedType : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can plant seeds");
    };

    if (plotIndex >= gridSize) {
      Runtime.trap("Invalid plot index");
    };

    let garden = getGardenOrDefault(caller);

    // Check if plot is already occupied
    switch (garden.plots[plotIndex]) {
      case (?_) {
        Runtime.trap("Plot is already occupied");
      };
      case (null) {
        // Plant the seed
        let newPlant : Plant = {
          seedType = seedType;
          growthStage = 0;
          waterCount = 0;
        };

        let updatedPlots = Array.tabulate(
          gridSize,
          func(i) {
            if (i == plotIndex) { ?newPlant } else { garden.plots[i] };
          },
        );

        let updatedGarden = {
          plots = updatedPlots;
          stats = garden.stats;
        };

        _gardens.add(caller, updatedGarden);
      };
    };
  };

  public shared ({ caller }) func waterPlant(plotIndex : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can water plants");
    };

    if (plotIndex >= gridSize) {
      Runtime.trap("Invalid plot index");
    };

    let garden = getGardenOrDefault(caller);

    switch (garden.plots[plotIndex]) {
      case (null) {
        Runtime.trap("No plant at this plot");
      };
      case (?plant) {
        let newWaterCount = plant.waterCount + 1;

        // Calculate new growth stage based on water count
        let newGrowthStage = if (newWaterCount >= 6) {
          3 // Fully bloomed
        } else if (newWaterCount >= 4) {
          2 // Growing
        } else if (newWaterCount >= 2) {
          1 // Sprout
        } else {
          0 // Seed
        };

        let updatedPlant : Plant = {
          seedType = plant.seedType;
          growthStage = newGrowthStage;
          waterCount = newWaterCount;
        };

        let updatedPlots = Array.tabulate(
          gridSize,
          func(i) {
            if (i == plotIndex) { ?updatedPlant } else { garden.plots[i] };
          },
        );

        // Update stats
        let newTotalBlooms = if (newGrowthStage == 3 and plant.growthStage != 3) {
          garden.stats.totalBlooms + 1;
        } else {
          garden.stats.totalBlooms;
        };

        let updatedStats : GardenStats = {
          totalBlooms = newTotalBlooms;
          totalWaters = garden.stats.totalWaters + 1;
        };

        let updatedGarden = {
          plots = updatedPlots;
          stats = updatedStats;
        };

        _gardens.add(caller, updatedGarden);
      };
    };
  };

  public shared ({ caller }) func clearPlot(plotIndex : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can clear plots");
    };

    if (plotIndex >= gridSize) {
      Runtime.trap("Invalid plot index");
    };

    let garden = getGardenOrDefault(caller);

    let updatedPlots = Array.tabulate(
      gridSize,
      func(i) {
        if (i == plotIndex) { null } else { garden.plots[i] };
      },
    );

    let updatedGarden = {
      plots = updatedPlots;
      stats = garden.stats;
    };

    _gardens.add(caller, updatedGarden);
  };

  public query ({ caller }) func getStats() : async GardenStats {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view stats");
    };
    let garden = getGardenOrDefault(caller);
    garden.stats;
  };

  // Admin function to view all gardens
  public query ({ caller }) func getAllGardens() : async [(Principal, Garden)] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view all gardens");
    };
    _gardens.toArray();
  };

  // Helper function to get garden or create default
  func getGardenOrDefault(caller : Principal) : Garden {
    switch (_gardens.get(caller)) {
      case (?garden) { garden };
      case (null) {
        let defaultGarden : Garden = {
          plots = Array.tabulate(gridSize, func(_) { null });
          stats = {
            totalBlooms = 0;
            totalWaters = 0;
          };
        };
        _gardens.add(caller, defaultGarden);
        defaultGarden;
      };
    };
  };
};
