<script lang="ts">
    export let volumes: Uint8Array;

    function avg(array: Uint8Array, start: number, end: number) {
        let sum = 0;

        array.slice(start, end).forEach((num) => (sum += num));

        return sum / (end - start);
    }

    $: volumesLength = volumes.length;

    $: spacing = (avg(volumes, 0, volumesLength) * 40) / 255;
</script>

<div
    class="container"
    style="transform: translate({(avg(volumes, 0, 20) * 30) / 255 - 15}px, {(avg(
        volumes,
        volumesLength / 1.2,
        volumesLength / 1.5
    ) *
        30) /
        255 -
        15}px)"
>
    <div
        class="lines"
        style="transform: scale({1 + avg(volumes, 0, 20) / 255}); opacity: {0.5 + avg(volumes, 0, volumesLength) / 510}"
    >
        {#each volumes as volume, i}
            <div
                class="line"
                style="height: calc(({(volume * 100) / 255} * (25vh - 40px)) / 100); background-color: hsl({180 -
                    (180 * volume) / 255}, 100%, 50%); transform: rotate({(360 / volumesLength) * i}deg) translateY(-{spacing}px)"
            />
        {/each}
    </div>
</div>

<style lang="scss">
    .container {
        position: absolute;
        left: 50%;
        top: calc(50% - 40px);

        .lines {
            position: absolute;
            height: 0;

            .line {
                width: 1px;
                position: absolute;
                transform-origin: bottom;
                bottom: 0;
            }
        }
    }
</style>
