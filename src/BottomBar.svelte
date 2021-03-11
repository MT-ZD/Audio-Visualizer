<script lang="ts">
    export let currentTime: number;
    export let duration: number;
    export let paused: boolean;

    $: formatedCurrentTime = formatTime(currentTime);
    $: formatedDuration = formatTime(duration);

    function formatTime(time: number) {
        const sec_num = Math.round(time);

        let hours = Math.floor(sec_num / 3600);
        let minutes = Math.floor((sec_num - hours * 3600) / 60);
        let seconds = sec_num - hours * 3600 - minutes * 60;

        const finalHours = hours >= 10 ? hours + ':' : hours > 0 ? '0' + hours + ':' : '';
        const finalMinutes = minutes >= 10 ? minutes + ':' : minutes > 0 ? '0' + minutes + ':' : '00:';
        const finalSeconds = seconds >= 10 ? seconds : seconds > 0 ? '0' + seconds : '00';

        return finalHours + finalMinutes + finalSeconds;
    }
</script>

<nav>
    <div class="play-pause" on:click={() => (paused = !paused)}>
        {#if paused}
            <img src="./img/play.svg" alt="" />
        {:else}
            <img src="./img/pause.svg" alt="" />
        {/if}
    </div>
    <div class="track">
        <input type="range" bind:value={currentTime} min="0" max={Math.round(duration)} />
    </div>
    <div class="length">
        {formatedCurrentTime} / {formatedDuration}
    </div>
</nav>

<style lang="scss">
    nav {
        position: fixed;
        bottom: 0;
        left: 0;
        background: #eee;
        height: 80px;
        display: flex;
        width: 100%;

        .play-pause {
            width: 80px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #ddd;

            img {
                height: 20px;
            }
        }

        .track {
            flex: 1;
            height: 80px;
            padding: 0 40px;
            display: flex;
            align-items: center;
            justify-content: center;

            input {
                width: 100%;
            }
        }

        .length {
            padding: 0px 40px;
            background: #ddd;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
        }
    }
</style>
