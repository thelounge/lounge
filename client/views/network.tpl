{{#each networks}}
<section id="network-{{id}}" class="network" data-id="{{id}}" data-nick="{{nick}}" data-options="{{toJSON serverOptions}}">
	{{> chan}}
</section>
{{/each}}
