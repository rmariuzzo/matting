<script lang="ts">
  let name = $state('world')
</script>

<main>
  <h1>Hello {name}!</h1>
  <input bind:value={name} placeholder="Your name" />
</main>
