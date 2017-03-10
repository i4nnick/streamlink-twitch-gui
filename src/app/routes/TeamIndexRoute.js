import {
	get,
	set,
	Route
} from "Ember";
import InfiniteScrollMixin from "mixins/InfiniteScrollMixin";
import { toArray } from "utils/ember/recordArrayMethods";
import preload from "utils/preload";


export default Route.extend( InfiniteScrollMixin, {
	itemSelector: ".stream-item-component",

	model() {
		const store = get( this, "store" );
		const model = this.modelFor( "team" );
		const users = get( model, "users" );
		const overall = get( users, "length" );

		const offset = get( this, "offset" );
		const limit = get( this, "limit" );

		let offsetCalculated = false;

		const fill = start => {
			const end = start + limit;
			const channels = users.slice( start, end );

			return Promise.all( channels.map( channel =>
				store.findRecord( "twitchStream", get( channel, "id" ), { reload: true } )
					.catch( () => false )
			) )
				.then( toArray() )
				.then( streams => streams.filter( Boolean ) )
				.then( streams => streams.length >= limit || end >= overall
					? streams
					: fill( end )
						.then( newStreams => streams.concat( newStreams ) )
				)
				.then( streams => {
					// The InfiniteScrollMixin uses a computed property for calculating the offset.
					// Manually keep track of the offset here...
					if ( !offsetCalculated ) {
						set( this, "offset", end );
						offsetCalculated = true;
					}

					return streams;
				});
		};

		return fill( offset )
			.then( preload( "preview.mediumLatest" ) );
	}
});
